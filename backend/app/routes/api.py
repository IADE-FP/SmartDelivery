from datetime import datetime, timezone
from hashlib import sha256
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user, get_db, require_roles
from app.core.security import (create_access_token, create_password_reset_token, digest_token,
                               hash_password, new_refresh_token, verify_password)
from app.models import (Address, Company, Delivery, DeliveryHistory, Driver, Notification,
                        RefreshToken, Route, RouteStop, User, Vehicle)
from app.models.entities import AccountStatus, DeliveryStatus, DriverAvailability, Role
from app.repositories.delivery_repository import (lock_delivery, lock_driver_for_user,
                                                  lock_owned_active_vehicle)
from app.services.delivery_service import accept_delivery as accept_delivery_service
from app.services.delivery_service import transition_delivery
from app.services.notifications import add_notice
from app.schemas.api import *

router = APIRouter()


def fail(status_code: int, message: str):
    raise HTTPException(status_code=status_code, detail=message)


def _aware(value: datetime) -> datetime:
    # SQLite drops timezone information for DateTime(timezone=True); PostgreSQL preserves it.
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def page_query(db: Session, statement, count_statement, limit: int, offset: int):
    total = db.scalar(count_statement) or 0
    return {"items": list(db.scalars(statement.limit(limit).offset(offset)).all()), "total": total,
            "limit": limit, "offset": offset}


def get_company(db: Session, user: User) -> Company:
    company = db.scalar(select(Company).where(Company.user_id == user.id))
    if company is None:
        fail(404, "Company profile not found")
    return company


def get_driver(db: Session, user: User) -> Driver:
    driver = db.scalar(select(Driver).where(Driver.user_id == user.id))
    if driver is None:
        fail(404, "Driver profile not found")
    return driver


def commit_or_conflict(db: Session):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        fail(409, "The operation conflicts with an existing record")


@router.post("/auth/company/register", status_code=201)
def register_company(body: CompanyRegistration, db: Session = Depends(get_db)):
    user = User(email=body.email.lower(), password_hash=hash_password(body.password), role=Role.COMPANY)
    company = Company(user=user, name=body.name, contact=body.contact, address=body.address)
    db.add(user)
    db.add(company)
    commit_or_conflict(db)
    return {"id": str(company.id), "name": company.name, "email": user.email}


@router.post("/auth/driver/register", status_code=201)
def register_driver(body: DriverRegistration, db: Session = Depends(get_db)):
    user = User(email=body.email.lower(), password_hash=hash_password(body.password), role=Role.DRIVER)
    driver = Driver(user=user, full_name=body.full_name, contact=body.contact, identity_number=body.identity_number)
    db.add(user)
    db.add(driver)
    commit_or_conflict(db)
    return {"id": str(driver.id), "full_name": driver.full_name, "email": user.email,
            "availability": driver.availability.value}


def issue_tokens(db: Session, user: User):
    raw, token_hash, expires = new_refresh_token()
    db.add(RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires))
    db.commit()
    return TokenResponse(access_token=create_access_token(user.id, user.role.value), refresh_token=raw,
                         expires_in=settings.access_token_minutes * 60)


@router.post("/auth/login", response_model=TokenResponse)
def login(body: LoginInput, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not verify_password(body.password, user.password_hash) or user.status != "ACTIVE":
        fail(401, "Invalid email or password")
    return issue_tokens(db, user)


@router.post("/auth/refresh", response_model=TokenResponse)
def refresh(body: RefreshInput, db: Session = Depends(get_db)):
    record = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == digest_token(body.refresh_token)).with_for_update())
    now = datetime.now(timezone.utc)
    if record is None or record.revoked_at is not None or _aware(record.expires_at) <= now:
        fail(401, "Invalid or expired refresh token")
    user = db.get(User, record.user_id)
    if user is None or user.status != "ACTIVE":
        fail(401, "Account is unavailable")
    record.revoked_at = now
    raw, token_hash, expires = new_refresh_token()
    db.add(RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires))
    db.commit()
    return TokenResponse(access_token=create_access_token(user.id, user.role.value), refresh_token=raw,
                         expires_in=settings.access_token_minutes * 60)


@router.post("/auth/logout", status_code=204)
def logout(body: LogoutInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    record = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == digest_token(body.refresh_token),
                                                   RefreshToken.user_id == user.id))
    if record:
        record.revoked_at = datetime.now(timezone.utc)
        db.commit()
    return Response(status_code=204)


@router.get("/auth/me")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = {"id": str(user.id), "email": user.email, "role": user.role.value, "status": user.status}
    if user.role == Role.COMPANY and user.company:
        data["profile"] = {"id": str(user.company.id), "name": user.company.name}
    elif user.role == Role.DRIVER and user.driver:
        data["profile"] = {"id": str(user.driver.id), "full_name": user.driver.full_name,
                           "availability": user.driver.availability.value}
    return data


@router.post("/auth/password-recovery")
def password_recovery(body: PasswordRecoveryRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    response = {"message": "If the account exists, recovery instructions will be sent"}
    if user:
        raw, digest, expires = create_password_reset_token()
        user.password_hash = user.password_hash  # Token delivery is intentionally deferred to email integration.
        # Store reset token hash in the same revocable credential table; prefix distinguishes its purpose.
        db.add(RefreshToken(user_id=user.id, token_hash=sha256(("reset:" + digest).encode()).hexdigest(), expires_at=expires))
        db.commit()
        # Development integration hook; production deployments must deliver this via email provider.
        if settings.recovery_token_in_response:
            response["recovery_token"] = raw
    return response


@router.post("/auth/password-recovery/complete")
def password_recovery_complete(body: PasswordRecoveryComplete, db: Session = Depends(get_db)):
    digest = sha256(("reset:" + digest_token(body.token)).encode()).hexdigest()
    record = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == digest).with_for_update())
    now = datetime.now(timezone.utc)
    if record is None or record.revoked_at or _aware(record.expires_at) <= now:
        fail(400, "Invalid or expired recovery token")
    user = db.get(User, record.user_id)
    user.password_hash = hash_password(body.new_password)
    record.revoked_at = now
    db.execute(RefreshToken.__table__.update().where(RefreshToken.user_id == user.id,
               RefreshToken.revoked_at.is_(None)).values(revoked_at=now))
    db.commit()
    return {"message": "Password updated"}


@router.post("/auth/change-password")
def change_password(body: PasswordChange, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not verify_password(body.current_password, user.password_hash):
        fail(400, "Current password is incorrect")
    user.password_hash = hash_password(body.new_password)
    db.execute(RefreshToken.__table__.update().where(RefreshToken.user_id == user.id,
               RefreshToken.revoked_at.is_(None)).values(revoked_at=datetime.now(timezone.utc)))
    db.commit()
    return {"message": "Password updated; please sign in again"}


@router.get("/company/profile")
def company_profile(user: User = Depends(require_roles("COMPANY")), db: Session = Depends(get_db)):
    c = get_company(db, user)
    return {"id": str(c.id), "name": c.name, "email": user.email, "contact": c.contact, "address": c.address, "status": c.status}


@router.put("/company/profile")
def company_update(body: CompanyUpdate, user: User = Depends(require_roles("COMPANY")), db: Session = Depends(get_db)):
    c = get_company(db, user)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(c, key, value)
    db.commit()
    return {"id": str(c.id), "name": c.name, "email": user.email, "contact": c.contact, "address": c.address}


@router.get("/drivers/me")
def driver_profile(user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    d = get_driver(db, user)
    return {"id": str(d.id), "full_name": d.full_name, "email": user.email, "contact": d.contact,
            "identity_number": d.identity_number, "availability": d.availability.value, "created_at": d.created_at}


@router.put("/drivers/me")
def driver_update(body: ProfileUpdate, user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    d = get_driver(db, user)
    for key, value in body.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(d, key, value)
    db.commit()
    return {"id": str(d.id), "full_name": d.full_name, "contact": d.contact}


@router.patch("/drivers/me/availability")
def driver_availability(body: AvailabilityUpdate, user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    d = get_driver(db, user)
    try:
        availability = DriverAvailability(body.availability)
    except ValueError:
        fail(422, "Invalid availability")
    if availability in {DriverAvailability.SUSPENDED, DriverAvailability.BUSY}:
        fail(422, "BUSY and SUSPENDED are managed by delivery operations and administrators")
    active = db.scalar(select(func.count()).select_from(Delivery).where(Delivery.driver_id == d.id,
                          Delivery.status.in_([DeliveryStatus.ACCEPTED, DeliveryStatus.IN_TRANSIT]))) or 0
    if active:
        fail(409, "Driver availability is locked while deliveries are active")
    d.availability = availability
    db.commit()
    return {"availability": d.availability.value}


@router.post("/vehicles", status_code=201)
def create_vehicle(body: VehicleCreate, user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    vehicle = Vehicle(driver_id=get_driver(db, user).id, **body.model_dump())
    db.add(vehicle)
    commit_or_conflict(db)
    return vehicle


@router.get("/vehicles")
def list_vehicles(user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    driver = get_driver(db, user)
    return list(db.scalars(select(Vehicle).where(Vehicle.driver_id == driver.id).order_by(Vehicle.created_at.desc())).all())


@router.get("/vehicles/{vehicle_id}")
def get_vehicle(vehicle_id: UUID, user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    v = db.get(Vehicle, vehicle_id)
    if v is None or v.driver_id != get_driver(db, user).id:
        fail(404, "Vehicle not found")
    return v


@router.put("/vehicles/{vehicle_id}")
def update_vehicle(vehicle_id: UUID, body: VehicleUpdate, user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    v = db.get(Vehicle, vehicle_id)
    if v is None or v.driver_id != get_driver(db, user).id:
        fail(404, "Vehicle not found")
    active_use = db.scalar(select(func.count()).select_from(Delivery).where(Delivery.vehicle_id == v.id,
                             Delivery.status.in_([DeliveryStatus.ACCEPTED, DeliveryStatus.IN_TRANSIT]))) or 0
    updates = body.model_dump(exclude_unset=True)
    if updates.get("active") is False and active_use:
        fail(409, "Vehicle is assigned to an active delivery")
    for key, value in updates.items():
        setattr(v, key, value)
    commit_or_conflict(db)
    return v


@router.delete("/vehicles/{vehicle_id}", status_code=204)
def delete_vehicle(vehicle_id: UUID, user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    v = db.get(Vehicle, vehicle_id)
    if v is None or v.driver_id != get_driver(db, user).id:
        fail(404, "Vehicle not found")
    active_use = db.scalar(select(func.count()).select_from(Delivery).where(Delivery.vehicle_id == v.id,
                             Delivery.status.in_([DeliveryStatus.ACCEPTED, DeliveryStatus.IN_TRANSIT]))) or 0
    if active_use:
        fail(409, "Vehicle is assigned to an active delivery")
    v.active = False
    db.commit()
    return Response(status_code=204)


def delivery_view(d: Delivery, include_driver: bool = False):
    result = {"id": str(d.id), "company_id": str(d.company_id), "recipient_name": d.recipient_name,
              "recipient_contact": d.recipient_contact, "pickup_address": d.pickup_address,
              "dropoff_address": d.dropoff_address, "description": d.description, "weight_kg": d.weight_kg,
              "dimensions": d.dimensions, "expected_at": d.expected_at, "fee": d.fee,
              "status": d.status.value, "created_at": d.created_at, "accepted_at": d.accepted_at,
              "completed_at": d.completed_at, "failure_reason": d.failure_reason}
    if include_driver and d.driver:
        result["driver"] = {"id": str(d.driver.id), "name": d.driver.full_name, "contact": d.driver.contact}
    return result


@router.post("/deliveries", status_code=201)
def create_delivery(body: DeliveryCreate, user: User = Depends(require_roles("COMPANY")), db: Session = Depends(get_db)):
    pickup = Address(**body.pickup_address.model_dump())
    dropoff = Address(**body.dropoff_address.model_dump())
    db.add_all([pickup, dropoff])
    db.flush()
    values = body.model_dump(exclude={"pickup_address", "dropoff_address"})
    delivery = Delivery(company_id=get_company(db, user).id, pickup_address_id=pickup.id,
                        dropoff_address_id=dropoff.id, **values)
    db.add(delivery)
    db.flush()
    db.add(DeliveryHistory(delivery_id=delivery.id, actor_user_id=user.id, to_status="PENDING", notes="Created"))
    db.commit()
    return delivery_view(delivery)


@router.get("/deliveries/available")
def available_deliveries(limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0),
                         user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    driver = get_driver(db, user)
    if driver.availability != DriverAvailability.AVAILABLE or driver.user.status != "ACTIVE":
        return {"items": [], "total": 0, "limit": limit, "offset": offset}
    stmt = select(Delivery).where(Delivery.status == DeliveryStatus.AVAILABLE).order_by(Delivery.created_at)
    count = select(func.count()).select_from(Delivery).where(Delivery.status == DeliveryStatus.AVAILABLE)
    data = page_query(db, stmt, count, limit, offset)
    data["items"] = [delivery_view(d) for d in data["items"]]
    return data


@router.get("/deliveries")
def list_deliveries(limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0),
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == Role.COMPANY:
        stmt = select(Delivery).where(Delivery.company_id == get_company(db, user).id)
        count = select(func.count()).select_from(Delivery).where(Delivery.company_id == get_company(db, user).id)
    elif user.role == Role.DRIVER:
        driver_id = get_driver(db, user).id
        stmt = select(Delivery).where(Delivery.driver_id == driver_id)
        count = select(func.count()).select_from(Delivery).where(Delivery.driver_id == driver_id)
    else:
        stmt, count = select(Delivery), select(func.count()).select_from(Delivery)
    data = page_query(db, stmt.order_by(Delivery.created_at.desc()), count, limit, offset)
    data["items"] = [delivery_view(d, user.role == Role.COMPANY) for d in data["items"]]
    return data


@router.get("/deliveries/{delivery_id}")
def get_delivery(delivery_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.get(Delivery, delivery_id)
    if d is None:
        fail(404, "Delivery not found")
    permitted = user.role == Role.ADMIN or (user.role == Role.COMPANY and d.company.user_id == user.id) or \
        (user.role == Role.DRIVER and (d.driver is not None and d.driver.user_id == user.id or d.status == DeliveryStatus.AVAILABLE))
    if not permitted:
        fail(404, "Delivery not found")
    return delivery_view(d, user.role == Role.COMPANY or user.role == Role.ADMIN)


@router.put("/deliveries/{delivery_id}")
def update_delivery(delivery_id: UUID, body: DeliveryUpdate, user: User = Depends(require_roles("COMPANY")), db: Session = Depends(get_db)):
    d = db.get(Delivery, delivery_id)
    if d is None or d.company.user_id != user.id:
        fail(404, "Delivery not found")
    if d.status != DeliveryStatus.PENDING:
        fail(409, "Only pending deliveries can be edited")
    updates = body.model_dump(exclude_unset=True)
    for field in ("pickup_address", "dropoff_address"):
        addr = updates.pop(field, None)
        if addr is not None:
            target = d.pickup_address if field == "pickup_address" else d.dropoff_address
            for key, value in addr.items():
                setattr(target, key, value)
    for key, value in updates.items():
        setattr(d, key, value)
    db.commit()
    return delivery_view(d)


@router.delete("/deliveries/{delivery_id}", status_code=204)
def cancel_delivery(delivery_id: UUID, user: User = Depends(require_roles("COMPANY")), db: Session = Depends(get_db)):
    d = db.get(Delivery, delivery_id)
    if d is None or d.company.user_id != user.id:
        fail(404, "Delivery not found")
    transition_delivery(db, d, DeliveryStatus.CANCELLED, user, "Cancelled by company")
    if d.driver:
        add_notice(db, d.driver.user_id, d.id, "DELIVERY_CANCELLED", f"Delivery {d.id} was cancelled")
        d.driver.availability = DriverAvailability.AVAILABLE
    db.commit()
    return Response(status_code=204)


@router.post("/deliveries/{delivery_id}/publish")
def publish_delivery(delivery_id: UUID, user: User = Depends(require_roles("COMPANY")), db: Session = Depends(get_db)):
    d = lock_delivery(db, delivery_id)
    if d is None or d.company.user_id != user.id:
        fail(404, "Delivery not found")
    transition_delivery(db, d, DeliveryStatus.AVAILABLE, user)
    drivers = db.scalars(select(Driver).where(Driver.availability == DriverAvailability.AVAILABLE)).all()
    for driver in drivers:
        add_notice(db, driver.user_id, d.id, "NEW_DELIVERY", f"A new delivery is available: {d.id}")
    db.commit()
    return delivery_view(d)


@router.post("/deliveries/{delivery_id}/accept")
def accept_delivery(delivery_id: UUID, body: AcceptDelivery, user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    driver = lock_driver_for_user(db, user.id)
    d = lock_delivery(db, delivery_id)
    if driver is None:
        fail(404, "Driver profile not found")
    if d is None:
        fail(404, "Delivery not found")
    vehicle = lock_owned_active_vehicle(db, body.vehicle_id, driver.id)
    if vehicle is None:
        fail(422, "Select an active vehicle owned by this driver")
    accept_delivery_service(db, d, driver, vehicle, user)
    db.commit()
    return delivery_view(d)


def owned_active_delivery(delivery_id: UUID, user: User, db: Session) -> Delivery:
    driver = get_driver(db, user)
    d = db.scalar(select(Delivery).where(Delivery.id == delivery_id, Delivery.driver_id == driver.id).with_for_update())
    if d is None:
        fail(404, "Delivery not found")
    return d


@router.post("/deliveries/{delivery_id}/start")
def start_delivery(delivery_id: UUID, body: DeliveryAction, user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    d = owned_active_delivery(delivery_id, user, db)
    transition_delivery(db, d, DeliveryStatus.IN_TRANSIT, user, body.notes)
    add_notice(db, d.company.user_id, d.id, "DELIVERY_STARTED", f"Delivery {d.id} is in transit")
    db.commit()
    return delivery_view(d)


@router.post("/deliveries/{delivery_id}/complete")
def complete_delivery(delivery_id: UUID, body: DeliveryAction, user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    d = owned_active_delivery(delivery_id, user, db)
    transition_delivery(db, d, DeliveryStatus.DELIVERED, user, body.notes)
    d.driver.availability = DriverAvailability.AVAILABLE
    add_notice(db, d.company.user_id, d.id, "DELIVERY_COMPLETED", f"Delivery {d.id} was completed")
    db.commit()
    return delivery_view(d)


@router.post("/deliveries/{delivery_id}/fail")
def fail_delivery(delivery_id: UUID, body: DeliveryAction, user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    if not body.notes:
        fail(422, "Failure reason is required in notes")
    d = owned_active_delivery(delivery_id, user, db)
    transition_delivery(db, d, DeliveryStatus.FAILED, user, body.notes)
    d.failure_reason = body.notes
    d.driver.availability = DriverAvailability.AVAILABLE
    add_notice(db, d.company.user_id, d.id, "DELIVERY_FAILED", f"Delivery {d.id} failed")
    db.commit()
    return delivery_view(d)


@router.get("/drivers/me/history")
def driver_history(limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0),
                   user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    did = get_driver(db, user).id
    stmt = select(Delivery).where(Delivery.driver_id == did).order_by(Delivery.created_at.desc())
    count = select(func.count()).select_from(Delivery).where(Delivery.driver_id == did)
    data = page_query(db, stmt, count, limit, offset)
    data["items"] = [delivery_view(d) for d in data["items"]]
    return data


@router.get("/routes")
def list_routes(user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    did = get_driver(db, user).id
    return [route_view(r) for r in db.scalars(select(Route).where(Route.driver_id == did).order_by(Route.created_at.desc())).all()]


@router.post("/routes", status_code=201)
def create_route(body: RouteCreate, user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    driver = get_driver(db, user)
    route = Route(driver_id=driver.id, name=body.name)
    db.add(route)
    db.flush()
    add_route_stops(db, route, body.stops, driver.id)
    db.commit()
    return route_view(route)


def add_route_stops(db: Session, route: Route, stops: list[RouteStopInput], driver_id: UUID):
    if len({s.sequence for s in stops}) != len(stops):
        fail(422, "Route stop sequence values must be unique")
    for stop in stops:
        if (stop.delivery_id is None) == (stop.address is None):
            fail(422, "Each stop must specify exactly one of delivery_id or address")
        address_id = None
        if stop.address:
            address = Address(**stop.address.model_dump())
            db.add(address)
            db.flush()
            address_id = address.id
        if stop.delivery_id:
            delivery = db.get(Delivery, stop.delivery_id)
            if delivery is None or delivery.driver_id != driver_id:
                fail(404, "Route can only include deliveries assigned to this driver")
        db.add(RouteStop(route_id=route.id, delivery_id=stop.delivery_id, address_id=address_id,
                         sequence=stop.sequence, notes=stop.notes))


@router.get("/routes/{route_id}")
def get_route(route_id: UUID, user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    route = db.get(Route, route_id)
    if route is None or route.driver_id != get_driver(db, user).id:
        fail(404, "Route not found")
    return route_view(route)


def route_view(route: Route):
    return {"id": str(route.id), "driver_id": str(route.driver_id), "name": route.name,
            "status": route.status, "created_at": route.created_at,
            "stops": [{"id": str(stop.id), "delivery_id": str(stop.delivery_id) if stop.delivery_id else None,
                       "address_id": str(stop.address_id) if stop.address_id else None,
                       "sequence": stop.sequence, "notes": stop.notes} for stop in route.stops]}


@router.put("/routes/{route_id}")
def update_route(route_id: UUID, body: RouteUpdate, user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    route = db.get(Route, route_id)
    driver = get_driver(db, user)
    if route is None or route.driver_id != driver.id:
        fail(404, "Route not found")
    updates = body.model_dump(exclude_unset=True)
    stops = updates.pop("stops", None)
    if "status" in updates and updates["status"] not in {"PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"}:
        fail(422, "Invalid route status")
    if "status" in updates:
        valid = {"PLANNED": {"IN_PROGRESS", "CANCELLED"}, "IN_PROGRESS": {"COMPLETED", "CANCELLED"},
                 "COMPLETED": set(), "CANCELLED": set()}
        if updates["status"] not in valid[route.status]:
            fail(409, "Invalid route status transition")
    if stops is not None:
        if route.status != "PLANNED":
            fail(409, "Only planned routes can be edited")
        route.stops.clear()
        db.flush()
        add_route_stops(db, route, body.stops or [], driver.id)
    for key, value in updates.items():
        setattr(route, key, value)
    db.commit()
    return route_view(route)


@router.post("/routes/{route_id}/start")
def start_route(route_id: UUID, user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    return set_route_status(route_id, "IN_PROGRESS", user, db)


@router.post("/routes/{route_id}/complete")
def complete_route(route_id: UUID, user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    return set_route_status(route_id, "COMPLETED", user, db)


def set_route_status(route_id: UUID, new_status: str, user: User, db: Session):
    route = db.get(Route, route_id)
    if route is None or route.driver_id != get_driver(db, user).id:
        fail(404, "Route not found")
    allowed = {"PLANNED": "IN_PROGRESS", "IN_PROGRESS": "COMPLETED"}
    if allowed.get(route.status) != new_status:
        fail(409, "Invalid route status transition")
    route.status = new_status
    db.commit()
    return route_view(route)


@router.get("/notifications")
def list_notifications(limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0),
                       user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc())
    count = select(func.count()).select_from(Notification).where(Notification.user_id == user.id)
    return page_query(db, stmt, count, limit, offset)


@router.get("/admin/users")
def admin_users(limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0),
                user: User = Depends(require_roles("ADMIN")), db: Session = Depends(get_db)):
    stmt = select(User).order_by(User.created_at.desc())
    count = select(func.count()).select_from(User)
    data = page_query(db, stmt, count, limit, offset)
    data["items"] = [{"id": str(u.id), "email": u.email, "role": u.role.value,
                      "status": u.status, "created_at": u.created_at} for u in data["items"]]
    return data


@router.patch("/admin/users/{target_user_id}/status")
def admin_set_user_status(target_user_id: UUID, body: AdminUserStatusUpdate, user: User = Depends(require_roles("ADMIN")),
                          db: Session = Depends(get_db)):
    target = db.get(User, target_user_id)
    if target is None:
        fail(404, "User not found")
    new_status = body.status
    if new_status not in {"ACTIVE", "SUSPENDED", "DISABLED"}:
        fail(422, "status must be ACTIVE, SUSPENDED or DISABLED")
    if target.id == user.id and new_status != "ACTIVE":
        fail(409, "An administrator cannot disable their own account")
    target.status = new_status
    if target.driver and new_status != "ACTIVE":
        target.driver.availability = DriverAvailability.SUSPENDED
    elif target.driver and target.driver.availability == DriverAvailability.SUSPENDED:
        target.driver.availability = DriverAvailability.OFFLINE
    if new_status != "ACTIVE":
        db.execute(RefreshToken.__table__.update().where(RefreshToken.user_id == target.id,
                   RefreshToken.revoked_at.is_(None)).values(revoked_at=datetime.now(timezone.utc)))
    db.commit()
    return {"id": str(target.id), "status": target.status}


@router.patch("/notifications/{notification_id}/read")
def read_notification(notification_id: UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.get(Notification, notification_id)
    if n is None or n.user_id != user.id:
        fail(404, "Notification not found")
    n.is_read = True
    db.commit()
    return {"id": str(n.id), "is_read": n.is_read}


def dashboard(db: Session, conditions):
    values = {}
    for state in DeliveryStatus:
        values[state.value.lower()] = db.scalar(select(func.count()).select_from(Delivery).where(*conditions, Delivery.status == state)) or 0
    values["total"] = db.scalar(select(func.count()).select_from(Delivery).where(*conditions)) or 0
    return values


@router.get("/dashboard/company")
def company_dashboard(user: User = Depends(require_roles("COMPANY")), db: Session = Depends(get_db)):
    return dashboard(db, [Delivery.company_id == get_company(db, user).id])


@router.get("/dashboard/driver")
def driver_dashboard(user: User = Depends(require_roles("DRIVER")), db: Session = Depends(get_db)):
    driver_id = get_driver(db, user).id
    result = dashboard(db, [Delivery.driver_id == driver_id])
    result["available"] = db.scalar(select(func.count()).select_from(Delivery).where(Delivery.status == DeliveryStatus.AVAILABLE)) or 0
    result["total_completed"] = result["delivered"]
    return result


@router.get("/dashboard/company/period")
def company_period(from_at: datetime, to_at: datetime, user: User = Depends(require_roles("COMPANY")), db: Session = Depends(get_db)):
    if from_at > to_at:
        fail(422, "from_at must be before to_at")
    cid = get_company(db, user).id
    result = {}
    for state in DeliveryStatus:
        result[state.value.lower()] = db.scalar(select(func.count()).select_from(Delivery).where(
            Delivery.company_id == cid, Delivery.created_at >= from_at, Delivery.created_at <= to_at,
            Delivery.status == state)) or 0
    return {"from_at": from_at, "to_at": to_at, "by_status": result}

