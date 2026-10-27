from datetime import UTC, datetime, timedelta

from app.engines.matching import propose_groups
from app.engines.routing import find_route


def test_pairwise_overlap_is_not_common_overlap():
    now = datetime.now(UTC)
    # A overlaps B and B overlaps C, but all three have no common departure time.
    intervals = [(0, 120), (90, 240), (180, 300)]
    intents = [{"id": str(i), "owner_id": str(i), "meeting_point_id": "meet_library", "destination_dorm_id": "dorm_esentepe",
                "earliest_at": (now + timedelta(seconds=lo)).isoformat(), "latest_at": (now + timedelta(seconds=hi)).isoformat()}
               for i, (lo, hi) in enumerate(intervals)]
    result = propose_groups(intents, now)
    assert result["groups"] == [] and len(result["unmatched"]) == 3


def test_groups_never_exceed_capacity_or_duplicate_members():
    now = datetime.now(UTC)
    intents = [{"id": str(i), "owner_id": str(i), "meeting_point_id": "meet_library", "destination_dorm_id": "dorm_esentepe",
                "earliest_at": now.isoformat(), "latest_at": (now + timedelta(minutes=10)).isoformat()} for i in range(18)]
    result = propose_groups(intents, now)
    members = [m for g in result["groups"] for m in g["member_ids"]]
    assert len(members) == len(set(members)) == 18
    assert all(3 <= len(g["member_ids"]) <= 5 for g in result["groups"])
    assert not result["optimality_claim"]


def test_lighting_route_has_explainable_nonnegative_cost():
    short = find_route("meet_library", "dorm_esentepe", prefer_lighting=False)
    lit = find_route("meet_library", "dorm_esentepe", prefer_lighting=True)
    assert lit["weighted_cost"] >= lit["distance_m"] > 0
    assert lit["distance_m"] > short["distance_m"]
    assert lit["data_source"] == "SYNTHETIC_SCHEMATIC"
    assert lit["physical_navigation_allowed"] is False
