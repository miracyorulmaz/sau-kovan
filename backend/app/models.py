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


class AssistanceCreate(RequestModel):
    walk_id: str = Field(max_length=80)
    reason: Literal["ESCORT_REQUEST", "HELP_REQUEST"] = "HELP_REQUEST"
    idempotency_key: str = Field(min_length=8, max_length=80)


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
