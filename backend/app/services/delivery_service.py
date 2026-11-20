from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Delivery, DeliveryHistory, Driver, User, Vehicle
from app.services.notifications import add_notice
from app.models.entities import DeliveryStatus, DriverAvailability


TRANSITIONS = {
    DeliveryStatus.PENDING: {DeliveryStatus.AVAILABLE, DeliveryStatus.CANCELLED},
    DeliveryStatus.AVAILABLE: {DeliveryStatus.ACCEPTED, DeliveryStatus.CANCELLED},
    DeliveryStatus.ACCEPTED: {DeliveryStatus.IN_TRANSIT, DeliveryStatus.CANCELLED},
    DeliveryStatus.IN_TRANSIT: {DeliveryStatus.DELIVERED, DeliveryStatus.FAILED},
    DeliveryStatus.DELIVERED: set(),
    DeliveryStatus.FAILED: set(),
    DeliveryStatus.CANCELLED: set(),
}


def transition_delivery(db: Session, delivery: Delivery, new_status: DeliveryStatus,
                        actor: User, notes: str | None = None) -> None:
    previous = delivery.status
    if new_status not in TRANSITIONS[previous]:
        raise HTTPException(status_code=409, detail=f"Invalid delivery transition: {previous.value} -> {new_status.value}")
    delivery.status = new_status
    if new_status == DeliveryStatus.DELIVERED:
        delivery.completed_at = datetime.now(timezone.utc)
    db.add(DeliveryHistory(delivery_id=delivery.id, actor_user_id=actor.id,
                           from_status=previous.value, to_status=new_status.value, notes=notes))


def accept_delivery(db: Session, delivery: Delivery, driver: Driver, vehicle: Vehicle,
                    actor: User) -> None:
    if delivery.status != DeliveryStatus.AVAILABLE:
        raise HTTPException(status_code=409, detail="Delivery is no longer available")
    if driver.availability != DriverAvailability.AVAILABLE or actor.status != "ACTIVE":
        raise HTTPException(status_code=409, detail="Driver is not available to accept deliveries")
    if delivery.weight_kg is not None and vehicle.capacity_kg is not None and delivery.weight_kg > vehicle.capacity_kg:
        raise HTTPException(status_code=409, detail="Vehicle capacity is below delivery weight")
    delivery.driver_id = driver.id
    delivery.vehicle_id = vehicle.id
    delivery.accepted_at = datetime.now(timezone.utc)
    transition_delivery(db, delivery, DeliveryStatus.ACCEPTED, actor)
    driver.availability = DriverAvailability.BUSY
    add_notice(db, user_id=delivery.company.user_id, delivery_id=delivery.id,
                        kind="DELIVERY_ACCEPTED", message=f"Delivery {delivery.id} was accepted")
    add_notice(db, user_id=actor.id, delivery_id=delivery.id,
                        kind="DELIVERY_ASSIGNED", message=f"Delivery {delivery.id} was assigned to you")
