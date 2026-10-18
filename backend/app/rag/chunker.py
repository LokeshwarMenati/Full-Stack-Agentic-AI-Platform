from dataclasses import dataclass
from typing import List
from app.rag.loader import DocumentPage


@dataclass
class DocumentChunk:
    chunk_id: str
    source: str
    page_number: int
    text: str


class TextChunker:
    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 150):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_pages(self, pages: List[DocumentPage]) -> List[DocumentChunk]:
        chunks: List[DocumentChunk] = []

        for page in pages:
            text = page.text
            if len(text) <= self.chunk_size:
                chunks.append(
                    DocumentChunk(
                        chunk_id=f"{page.source}_p{page.page_number}_c0",
                        source=page.source,
                        page_number=page.page_number,
                        text=text
                    )
                )
                continue

            start = 0
            chunk_idx = 0
            while start < len(text):
                end = min(start + self.chunk_size, len(text))
                
                # If we're not at the very end, try to find a natural break point (paragraph or period)
                if end < len(text):
                    # Look backwards for newline or sentence end
                    break_point = max(
                        text.rfind('\n', start, end),
                        text.rfind('. ', start, end)
                    )
                    if break_point > start + (self.chunk_size // 2):
                        end = break_point + 1

                chunk_text = text[start:end].strip()
                if chunk_text:
                    chunks.append(
                        DocumentChunk(
                            chunk_id=f"{page.source}_p{page.page_number}_c{chunk_idx}",
                            source=page.source,
                            page_number=page.page_number,
                            text=chunk_text
                        )
                    )
                    chunk_idx += 1

                if end >= len(text):
                    break
                start = max(end - self.chunk_overlap, start + 1)

        return chunks
