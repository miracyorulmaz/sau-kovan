from datetime import datetime
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator


class RequestModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Login(RequestModel):
    access_code: str = Field(min_length=12, max_length=256)


class Review(RequestModel):
    expected_version: int = Field(ge=1)
    decision: Literal["APPROVED_PILOT", "REJECTED", "REVOKED"]
    method: Literal["DEMO_TEST"] = "DEMO_TEST"
    student_eligibility_checked: bool = False
    women_student_eligibility_checked: bool = False
    verified_dorm_id: str | None = None


class IntentCreate(RequestModel):
    meeting_point_id: str = Field(max_length=80)
    destination_dorm_id: str = Field(max_length=80)
    earliest_at: AwareDatetime
    latest_at: AwareDatetime

    @model_validator(mode="after")
    def validate_window(self):
        if self.latest_at <= self.earliest_at:
            raise ValueError("Bitiş, başlangıçtan sonra olmalı.")
        if (self.latest_at - self.earliest_at).total_seconds() > 1800:
            raise ValueError("Ayrılış aralığı en çok 30 dakika olabilir.")
        return self


class VersionCommand(RequestModel):
    expected_version: int = Field(ge=1)


class WalkStart(RequestModel):
    pod_id: str = Field(max_length=80)
    arrival_check_enabled: bool = False
    estimated_duration_seconds: int = Field(default=900, ge=60, le=7200)
    map_preview_id: str | None = Field(default=None, max_length=80)


class LocationFix(RequestModel):
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    accuracy_m: float = Field(ge=0, le=100000, allow_inf_nan=False)
    captured_at: AwareDatetime
    source: Literal["DEVICE", "DEMO"] = "DEVICE"


class AssistanceCreate(RequestModel):
    walk_id: str = Field(max_length=80)
    reason: Literal["ESCORT_REQUEST", "HELP_REQUEST"] = "HELP_REQUEST"
    idempotency_key: str = Field(min_length=8, max_length=80)
    location: LocationFix | None = None
    location_status: Literal["AVAILABLE", "DENIED", "TIMEOUT", "UNAVAILABLE", "NOT_REQUESTED"] = "NOT_REQUESTED"


class EmergencyContact(RequestModel):
    name: str = Field(min_length=2, max_length=80)
    phone_e164: str = Field(pattern=r"^\+[1-9]\d{7,14}$")
    consent_confirmed: bool
    notify_on_help: bool = True
    share_location_on_help: bool = True


class EmergencyCreate(RequestModel):
    idempotency_key: str = Field(min_length=8, max_length=80)
    message: str = Field(default="Kampüs dışında desteğe ihtiyacım var.", min_length=1, max_length=500)
    location: LocationFix | None = None
    location_status: Literal["AVAILABLE", "DENIED", "TIMEOUT", "UNAVAILABLE", "NOT_REQUESTED"] = "NOT_REQUESTED"


class DemoCompanions(RequestModel):
    immediate: bool = False


class DemoAction(VersionCommand):
    unit_id: str = Field(default="guard-01", max_length=80)


class MapPoint(RequestModel):
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    confirmed: bool


class Assignment(VersionCommand):
    unit_id: str = Field(max_length=80)


class Resolution(VersionCommand):
    resolution: Literal["STUDENT_CONFIRMED", "CONTACT_COMPLETED", "DEMO_COMPLETED"]


class DemoReset(RequestModel):
    student_count: int = Field(default=0, ge=0, le=60)


class EdgeOverride(RequestModel):
    closed: bool


def iso(value: datetime) -> str:
    return value.isoformat()
