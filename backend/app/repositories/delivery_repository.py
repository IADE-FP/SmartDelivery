from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Delivery, Driver, Vehicle
from app.models.entities import DeliveryStatus


def lock_delivery(db: Session, delivery_id: UUID) -> Delivery | None:
    return db.scalar(select(Delivery).where(Delivery.id == delivery_id).with_for_update())


def lock_driver_for_user(db: Session, user_id: UUID) -> Driver | None:
    return db.scalar(select(Driver).where(Driver.user_id == user_id).with_for_update())


def lock_owned_active_vehicle(db: Session, vehicle_id: UUID, driver_id: UUID) -> Vehicle | None:
    return db.scalar(select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.driver_id == driver_id,
                                           Vehicle.active.is_(True)).with_for_update())


def has_active_driver_delivery(db: Session, driver_id: UUID) -> bool:
    return db.scalar(select(Delivery.id).where(Delivery.driver_id == driver_id,
                    Delivery.status.in_([DeliveryStatus.ACCEPTED, DeliveryStatus.IN_TRANSIT])).limit(1)) is not None
