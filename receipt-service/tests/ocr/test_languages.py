from app.ocr.languages import SUPPORTED_LANGUAGES, paddle_lang_for, tesseract_lang_for


def test_all_supported_languages_have_a_tesseract_mapping():
    for language in SUPPORTED_LANGUAGES:
        assert tesseract_lang_for(language) != "eng" or language == "en"


def test_hebrew_has_no_paddle_model():
    assert paddle_lang_for("he") is None
    assert tesseract_lang_for("he") == "heb"


def test_latin_script_languages_map_to_paddle():
    assert paddle_lang_for("en") == "en"
    assert paddle_lang_for("it") == "it"
    assert paddle_lang_for("de") == "german"
    assert paddle_lang_for("fr") == "french"
    assert paddle_lang_for("ar") == "ar"


def test_unknown_language_falls_back_to_english_tesseract():
    assert tesseract_lang_for("xx") == "eng"
