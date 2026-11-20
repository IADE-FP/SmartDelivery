from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CompanyRegistration(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    contact: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=500)


class DriverRegistration(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    contact: str | None = Field(default=None, max_length=40)
    identity_number: str | None = Field(default=None, max_length=100)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class RefreshInput(BaseModel):
    refresh_token: str


class LogoutInput(BaseModel):
    refresh_token: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=10, max_length=128)


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=200)
    contact: str | None = Field(default=None, max_length=40)


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    contact: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=500)


class AvailabilityUpdate(BaseModel):
    availability: str


class VehicleCreate(BaseModel):
    registration: str = Field(min_length=2, max_length=30)
    make: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=100)
    vehicle_type: str = Field(min_length=1, max_length=50)
    capacity_kg: float | None = Field(default=None, gt=0)


class VehicleUpdate(BaseModel):
    registration: str | None = Field(default=None, min_length=2, max_length=30)
    make: str | None = Field(default=None, min_length=1, max_length=100)
    model: str | None = Field(default=None, min_length=1, max_length=100)
    vehicle_type: str | None = Field(default=None, min_length=1, max_length=50)
    capacity_kg: float | None = Field(default=None, gt=0)
    active: bool | None = None


class AddressInput(BaseModel):
    line: str = Field(min_length=3, max_length=500)
    city: str | None = Field(default=None, max_length=150)
    postal_code: str | None = Field(default=None, max_length=30)
    country: str = Field(default="PT", min_length=2, max_length=2)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class DeliveryCreate(BaseModel):
    recipient_name: str = Field(min_length=2, max_length=200)
    recipient_contact: str = Field(min_length=3, max_length=40)
    pickup_address: AddressInput
    dropoff_address: AddressInput
    description: str | None = None
    weight_kg: float | None = Field(default=None, gt=0)
    dimensions: str | None = Field(default=None, max_length=200)
    expected_at: datetime | None = None
    fee: float | None = Field(default=None, ge=0)


class DeliveryUpdate(BaseModel):
    recipient_name: str | None = Field(default=None, min_length=2, max_length=200)
    recipient_contact: str | None = Field(default=None, min_length=3, max_length=40)
    pickup_address: AddressInput | None = None
    dropoff_address: AddressInput | None = None
    description: str | None = None
    weight_kg: float | None = Field(default=None, gt=0)
    dimensions: str | None = Field(default=None, max_length=200)
    expected_at: datetime | None = None
    fee: float | None = Field(default=None, ge=0)


class AcceptDelivery(BaseModel):
    vehicle_id: UUID


class DeliveryAction(BaseModel):
    notes: str | None = Field(default=None, max_length=2000)


class RouteStopInput(BaseModel):
    delivery_id: UUID | None = None
    address: AddressInput | None = None
    sequence: int = Field(ge=1)
    notes: str | None = Field(default=None, max_length=500)


class RouteCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    stops: list[RouteStopInput] = Field(min_length=1)


class RouteUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    status: str | None = None
    stops: list[RouteStopInput] | None = None


class PasswordRecoveryRequest(BaseModel):
    email: EmailStr


class PasswordRecoveryComplete(BaseModel):
    token: str
    new_password: str = Field(min_length=10, max_length=128)


class AdminUserStatusUpdate(BaseModel):
    status: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class Page(BaseModel):
    items: list[dict]
    total: int
    limit: int
    offset: int


class SimpleMessage(BaseModel):
    message: str

