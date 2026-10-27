"""User-selected allowlists. Physical entrance coordinates remain unverified."""

DORM_SOURCE = "https://kygm.gsb.gov.tr/Ajax/gettesis.aspx?il=sakarya"
DORMS = {
    "dorm_sabahattin_zaim": "Sabahattin Zaim Öğrenci Yurdu",
    "dorm_rahime_sultan": "Rahime Sultan Öğrenci Yurdu",
    "dorm_ayse_humeyra_okten": "Ayşe Hümeyra Ökten Öğrenci Yurdu",
    "dorm_esentepe": "Esentepe Kız Öğrenci Yurdu",
}
MEETINGS = {
    "meet_library": "Kütüphane",
    "meet_cinaralti": "Çınaraltı",
    "meet_campus_gate": "Kampüs girişi",
    "meet_campus_market": "Kampüs market önü",
}


def catalog():
    return {
        "dormitories": [
            {"id": key, "name": name, "type": "GIRLS_DORM", "source": DORM_SOURCE,
             "entrance_coordinates": None, "physical_route_verified": False,
             "enabled_in_demo": True}
            for key, name in DORMS.items()
        ],
        "meeting_points": [
            {"id": key, "name": name, "coordinates": None,
             "field_check": "PENDING", "enabled_in_demo": True}
            for key, name in MEETINGS.items()
        ],
        "notice": "Konum isimleri pilot listesidir; şematik rota gerçek kampüs yönlendirmesi değildir.",
    }
