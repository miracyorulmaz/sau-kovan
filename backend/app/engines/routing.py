"""Schematic, non-geographic graph. All costs are nonnegative."""
import heapq
import itertools

from ..catalog import DORMS, MEETINGS
from ..errors import DomainError


def demo_edges():
    edges = []
    for index, node in enumerate(MEETINGS):
        edges.append({"id": f"start-{index}", "a": node, "b": "junction", "length_m": 60 + index * 20, "lighting": 0.8})
    edges.append({"id": "main-spine", "a": "junction", "b": "lit-junction", "length_m": 140, "lighting": 0.95})
    for index, node in enumerate(DORMS):
        edges.extend([
            {"id": f"direct-{index}", "a": "junction", "b": node, "length_m": 180 + index * 30, "lighting": 0.2},
            {"id": f"lit-{index}", "a": "lit-junction", "b": node, "length_m": 130 + index * 30, "lighting": 0.9},
        ])
    return edges


def find_route(origin, destination, closed=(), prefer_lighting=True):
    if origin not in MEETINGS or destination not in DORMS:
        raise DomainError("LOCATION_NOT_ALLOWED", "Başlangıç veya varış pilot listesinde değil.", 422)
    adjacency = {}
    for edge in demo_edges():
        if edge["id"] in closed:
            continue
        cost = edge["length_m"] * (1 + (3 * (1 - edge["lighting"]) if prefer_lighting else 0))
        for a, b in ((edge["a"], edge["b"]), (edge["b"], edge["a"])):
            adjacency.setdefault(a, []).append((b, cost, edge))
    counter = itertools.count()
    queue = [(0.0, next(counter), origin, [], 0)]
    best = {origin: 0.0}
    while queue:
        cost, _, node, edges, distance = heapq.heappop(queue)
        if cost > best.get(node, float("inf")):
            continue
        if node == destination:
            return {"edge_ids": edges, "distance_m": distance, "weighted_cost": round(cost, 2),
                    "geometry": None, "data_source": "SYNTHETIC_SCHEMATIC",
                    "physical_navigation_allowed": False,
                    "label": "Aydınlatma öncelikli (örnek)" if prefer_lighting else "En kısa (örnek)"}
        for target, weight, edge in adjacency.get(node, []):
            candidate = cost + weight
            if candidate < best.get(target, float("inf")):
                best[target] = candidate
                heapq.heappush(queue, (candidate, next(counter), target, edges + [edge["id"]], distance + edge["length_m"]))
    raise DomainError("NO_ROUTE", "Bu örnek ağda açık bağlantı bulunamadı.", 409)
