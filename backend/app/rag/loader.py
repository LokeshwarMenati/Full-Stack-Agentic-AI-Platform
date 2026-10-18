from dataclasses import dataclass
from pathlib import Path
import re
from typing import List, Optional
import pypdf

from app.core.logging import logger


@dataclass
class DocumentPage:
    source: str
    page_number: int
    text: str


class PDFLoader:
    @staticmethod
    def clean_text(text: str) -> str:
        # Normalize non-printable/weird replacement chars
        text = text.replace('\ufffd', "'").replace('\x00', '')
        # Normalize consecutive whitespaces while preserving paragraph breaks
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    @classmethod
    def load_text_file(cls, file_path: str | Path) -> List[DocumentPage]:
        path = Path(file_path)
        raw_text = path.read_text(encoding="utf-8", errors="replace")
        cleaned = cls.clean_text(raw_text)
        if not cleaned:
            return []
        return [
            DocumentPage(
                source=path.name,
                page_number=1,
                text=cleaned,
            )
        ]

    @classmethod
    def load_document(cls, file_path: str | Path) -> List[DocumentPage]:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Document not found at: {path.resolve()}")

        suffix = path.suffix.lower()
        if suffix in {".txt", ".md"}:
            pages = cls.load_text_file(path)
            logger.info(f"Loaded {len(pages)} text page(s) from {path.name}")
            return pages
        return cls.load_pdf(path)

    @classmethod
    def load_pdf(cls, file_path: str | Path) -> List[DocumentPage]:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"PDF document not found at: {path.resolve()}")

        filename = path.name
        pages: List[DocumentPage] = []
        try:
            reader = pypdf.PdfReader(str(path))
            for idx, page in enumerate(reader.pages):
                raw_text = page.extract_text() or ""
                cleaned = cls.clean_text(raw_text)
                if cleaned:
                    pages.append(
                        DocumentPage(
                            source=filename,
                            page_number=idx + 1,  # 1-indexed page
                            text=cleaned
                        )
                    )
            logger.info(f"Loaded {len(pages)} pages with text from {filename}")
            return pages
        except Exception as e:
            logger.error(f"Failed to extract text from {filename}: {e}")
            raise
