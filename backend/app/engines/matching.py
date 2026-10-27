from datetime import datetime


def propose_groups(intents, now):
    """Earliest-deadline greedy groups, with a common interval for every member."""
    buckets = {}
    for intent in intents:
        key = (intent["meeting_point_id"], intent["destination_dorm_id"])
        buckets.setdefault(key, []).append(intent)
    groups, unmatched = [], []
    for key, bucket in sorted(buckets.items()):
        pending = sorted(bucket, key=lambda i: (i["latest_at"], i["id"]))
        while pending:
            first = pending.pop(0)
            selected = [first]
            lower = max(now, datetime.fromisoformat(first["earliest_at"]))
            upper = datetime.fromisoformat(first["latest_at"])
            for candidate in list(pending):
                lo = max(lower, datetime.fromisoformat(candidate["earliest_at"]))
                hi = min(upper, datetime.fromisoformat(candidate["latest_at"]))
                if lo <= hi and len(selected) < 5:
                    selected.append(candidate)
                    lower, upper = lo, hi
            if len(selected) < 3 or lower > upper:
                unmatched.append({"intent_id": first["id"], "reason": "NO_COMMON_WINDOW_OR_MINIMUM_GROUP"})
                continue
            selected_ids = {item["id"] for item in selected}
            pending = [item for item in pending if item["id"] not in selected_ids]
            groups.append({"meeting_point_id": key[0], "destination_dorm_id": key[1],
                           "intent_ids": [item["id"] for item in selected],
                           "member_ids": [item["owner_id"] for item in selected],
                           "departure_at": lower.isoformat(), "latest_departure_at": upper.isoformat()})
    return {"groups": groups, "unmatched": unmatched, "algorithm": "DETERMINISTIC_GREEDY", "optimality_claim": False}
