"""Pilot allowlists and sourced Google Maps pins, distinct from field verification."""
from copy import deepcopy

CATALOG_VERSION = "2026-10-28-campus-v2"

DORM_SOURCE = "https://kygm.gsb.gov.tr/Ajax/gettesis.aspx?il=sakarya"
DORMS = {
    "dorm_sabahattin_zaim": "Sabahattin Zaim Öğrenci Yurdu",
    "dorm_rahime_sultan": "Rahime Sultan Öğrenci Yurdu",
    "dorm_ayse_humeyra_okten": "Ayşe Hümeyra Ökten Öğrenci Yurdu",
    "dorm_esentepe": "Esentepe Kız Öğrenci Yurdu",
}
MEETINGS = {
    "meet_library": "SAÜ Kütüphanesi",
    "meet_adibahce": "Kampüs Adıbahçe",
    "meet_campus_gate": "Kampüs girişi",
    "meet_final_stop": "Son durak",
}


def _pin(latitude, longitude, feature_id, name, user_selected=False):
    return {"latitude": latitude, "longitude": longitude, "confirmed": True,
            "confirmed_by": "catalog", "source_url": "https://www.google.com/maps/place//data=!4m2!3m1!1s" + feature_id,
            "source_place_name": name, "source_kind": "USER_GOOGLE_MAPS_PIN" if user_selected else "GOOGLE_MAPS_LOOKUP",
            "retrieved_on": "2026-10-28", "verification_scope": "MAP_PIN_ONLY", "physical_entrance_verified": False}


DEFAULT_MAP_POINTS = {
    "meet_library": _pin(40.741753, 30.332127, "0x14ccadf2a70df4fd:0x5cbf292d4eca1096", "Sakarya Üniversitesi Merkez Kütüphanesi", True),
    "meet_adibahce": _pin(40.7436949, 30.3322774, "0x14ccad8d67492cbd:0xf09a1f836325de69", "Adıbahçe", True),
    "meet_campus_gate": _pin(40.7436182, 30.3398823, "0x14ccad8d57ac3b53:0xeda1f7a0c5dbbd33", "SAÜ Sürekli Eğitim Uygulama ve Araştırma Merkezi (SAÜSEM)", True),
    "meet_final_stop": _pin(40.7404026, 30.3295074, "0x14ccadedb277ca41:0x4f1c045e72f2f38e", "Vib Turizm", True),
    "dorm_sabahattin_zaim": _pin(40.7361529, 30.3385152, "0x14ccadf402d86aa9:0xaab3e808699006c0", "Sabahattin Zaim KYK Kız Öğrenci Yurdu", True),
    "dorm_rahime_sultan": _pin(40.7469399, 30.3450059, "0x14ccb277bf2b8a31:0xeb87144b47e884b4", "KYK Rahime Sultan Kız Öğrenci Yurdu"),
    "dorm_ayse_humeyra_okten": _pin(40.7504178, 30.3445008, "0x14ccb3c0a572f229:0x3a3d0c53501f9d56", "Ayşe Hümeyra Ökten Öğrenci Yurdu"),
    "dorm_esentepe": _pin(40.7459781, 30.3288432, "0x14ccad005f01be73:0xf54a9904c3050f86", "KYK Esentepe Yurt Müdürlüğü"),
}


def default_map_points():
    return deepcopy(DEFAULT_MAP_POINTS)


def catalog(map_points=None):
    points = default_map_points() if map_points is None else map_points
    return {
        "version": CATALOG_VERSION,
        "dormitories": [
            {"id": key, "name": name, "type": "GIRLS_DORM", "source": DORM_SOURCE,
             "entrance_coordinates": None, "physical_route_verified": False,
             "map_coordinates": deepcopy(points.get(key)), "enabled_in_demo": True}
            for key, name in DORMS.items()
        ],
        "meeting_points": [
            {"id": key, "name": name, "coordinates": deepcopy(points.get(key)),
             "field_check": "PENDING", "enabled_in_demo": True}
            for key, name in MEETINGS.items()
        ],
        "notice": "Google Maps pinleri kayıtlıdır; girişler ve buluşma alanları sahada teyit edilmemiştir. Google yürüyüş rotası güvenlik değerlendirmesi değildir; şematik ağ sentetiktir.",
    }
