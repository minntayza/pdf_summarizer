"""Extract text from PDF files using PyMuPDF."""

import fitz  # PyMuPDF
from pathlib import Path


class PDFError(Exception):
    """Base exception for PDF processing errors."""


class NoTextExtractedError(PDFError):
    """Raised when a PDF has no extractable text."""


class EncryptedPDFError(PDFError):
    """Raised when a PDF is encrypted/cannot be opened."""


class InvalidFileTypeError(PDFError):
    """Raised when the file is not a valid PDF."""


def extract_text(pdf_path: str) -> str:
    """
    Extract all text from a PDF file page by page.

    Args:
        pdf_path: Path to the PDF file.

    Returns:
        Concatenated text with page markers like [Page 1].

    Raises:
        FileNotFoundError: If the file doesn't exist.
        InvalidFileTypeError: If the file is not a PDF.
        EncryptedPDFError: If the PDF is encrypted.
        NoTextExtractedError: If no text could be extracted.
    """
    path = Path(pdf_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {pdf_path}")

    if path.suffix.lower() != ".pdf":
        raise InvalidFileTypeError(f"Not a PDF file: {pdf_path}")

    try:
        doc = fitz.open(str(path))
    except fitz.FileDataError:
        raise InvalidFileTypeError(f"File is corrupted or not a valid PDF: {pdf_path}")
    except Exception as e:
        if "encryption" in str(e).lower() or "password" in str(e).lower():
            raise EncryptedPDFError(f"PDF is encrypted: {pdf_path}. Please decrypt it first.")
        raise PDFError(f"Could not open PDF: {e}")

    pages_text = []

    for page_num, page in enumerate(doc, start=1):
        text = page.get_text().strip()
        if text:
            pages_text.append(f"\n[Page {page_num}]\n{text}")

    doc.close()

    if not pages_text:
        raise NoTextExtractedError(
            "No extractable text found in this PDF. "
            "This tool works best with text-heavy lecture PDFs. "
            "Image-only or scanned PDFs are not supported in the current version."
        )

    return "\n".join(pages_text)


def get_page_count(pdf_path: str) -> int:
    """Return the number of pages in a PDF without extracting text."""
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {pdf_path}")
    try:
        doc = fitz.open(str(path))
    except fitz.FileDataError:
        raise InvalidFileTypeError(f"File is corrupted or not a valid PDF: {pdf_path}")
    except Exception as e:
        if "encryption" in str(e).lower() or "password" in str(e).lower():
            raise EncryptedPDFError(f"PDF is encrypted: {pdf_path}. Please decrypt it first.")
        raise PDFError(f"Could not open PDF: {e}")
    count = doc.page_count
    doc.close()
    return count
