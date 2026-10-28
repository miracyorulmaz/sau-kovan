"""Public labels never include another student's full display name."""


def masked_name(name):
    parts = str(name or "").split()
    if not parts:
        return "Öğrenci"
    def mask(part):
        if not part[0].isalpha():
            return "*" * len(part)
        initial = part[0].replace("i", "İ").replace("ı", "I").upper()
        return initial + "*" * max(1, len(part) - 1)
    return " ".join(mask(part) for part in parts)
