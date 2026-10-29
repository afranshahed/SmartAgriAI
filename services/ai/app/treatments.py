DEFAULT_TREATMENT = {
    "immediate": [
        "Isolate the affected plant from nearby healthy plants.",
        "Remove badly damaged leaves with sanitized tools.",
        "Avoid overhead watering while symptoms are present.",
    ],
    "organic": [
        "Apply neem oil or a copper-based organic fungicide according to the label.",
        "Improve airflow around the canopy with light pruning.",
    ],
    "chemical": [
        "Use a crop-approved fungicide or bactericide only when symptoms continue to spread.",
        "Rotate active ingredients to reduce resistance risk.",
    ],
    "prevention": [
        "Inspect leaves twice weekly during humid weather.",
        "Water at soil level early in the day.",
        "Remove crop debris after harvest.",
    ],
}

TREATMENTS = {
    "healthy": {
        "immediate": ["No disease treatment is needed based on this scan."],
        "organic": ["Keep using balanced nutrition and steady irrigation."],
        "chemical": ["No chemical treatment is recommended for a healthy result."],
        "prevention": [
            "Continue routine scouting.",
            "Keep leaves dry where possible.",
            "Maintain spacing for airflow.",
        ],
    },
    "late_blight": {
        "immediate": [
            "Remove infected leaves and destroy them away from the growing area.",
            "Stop overhead watering and keep foliage dry.",
        ],
        "organic": ["Use copper fungicide where permitted and repeat according to label intervals."],
        "chemical": ["Consider a registered late-blight fungicide for the crop if disease pressure is high."],
        "prevention": [
            "Increase spacing and airflow.",
            "Avoid working with wet plants.",
            "Remove volunteer host plants.",
        ],
    },
    "early_blight": {
        "immediate": ["Prune lower infected leaves and remove plant debris from soil contact."],
        "organic": ["Apply copper or Bacillus-based biological fungicide according to product directions."],
        "chemical": ["Use a registered protectant fungicide when lesions continue expanding."],
        "prevention": [
            "Mulch to reduce soil splash.",
            "Rotate away from solanaceous crops.",
            "Avoid nitrogen stress.",
        ],
    },
    "powdery_mildew": {
        "immediate": ["Remove heavily infected leaves and reduce canopy crowding."],
        "organic": ["Apply sulfur, potassium bicarbonate, or neem products where crop-safe."],
        "chemical": ["Use a registered powdery mildew fungicide if organic controls are insufficient."],
        "prevention": [
            "Improve airflow.",
            "Avoid excessive nitrogen.",
            "Monitor closely during warm dry days with humid nights.",
        ],
    },
    "bacterial_spot": {
        "immediate": ["Remove infected foliage and avoid handling wet plants."],
        "organic": ["Use copper-based bactericide where permitted."],
        "chemical": ["Follow local extension guidance for crop-approved bactericides."],
        "prevention": [
            "Use disease-free seed or transplants.",
            "Disinfect tools.",
            "Use drip irrigation.",
        ],
    },
}

SYMPTOMS = {
    "healthy": [],
    "late_blight": ["Water-soaked lesions", "Brown leaf patches", "Rapid spread in humid conditions"],
    "early_blight": ["Concentric ring spots", "Yellowing around lesions", "Lower-leaf infection"],
    "powdery_mildew": ["White powdery growth", "Leaf curling", "Reduced vigor"],
    "bacterial_spot": ["Small dark leaf spots", "Yellow halos", "Shot-hole tearing"],
}


def normalize_key(label: str) -> str:
    return label.lower().replace(" ", "_").replace("-", "_")


def disease_key(label: str) -> str:
    parts = normalize_key(label).split("___")
    return parts[-1] if parts else normalize_key(label)


def crop_name(label: str) -> str:
    return label.split("___")[0].replace("_", " ").title()


def treatment_for(label: str):
    key = disease_key(label)
    return TREATMENTS.get(key, DEFAULT_TREATMENT)


def symptoms_for(label: str):
    return SYMPTOMS.get(disease_key(label), [])


def severity_for(label: str, confidence: float) -> str:
    key = disease_key(label)
    if key == "healthy":
        return "low"
    if confidence >= 0.9:
        return "high"
    if confidence >= 0.7:
        return "medium"
    return "low"
