
import sys
from pathlib import Path

try:
    from rdflib import Graph
except ImportError:
    print("FEHLER: rdflib ist nicht installiert (pip install rdflib).")
    sys.exit(1)

SPARQL_DIR = Path(__file__).resolve().parent
REPO_ROOT = SPARQL_DIR.parent
ONTOLOGY_DIR = REPO_ROOT / "ontology"

TTL_FILES = [
    ONTOLOGY_DIR / "pacman-ontology.ttl",
    ONTOLOGY_DIR / "example-state.ttl",
]

EXPECTED = {
    "danger-ghost-near": True,           
    "power-mode-active": False,          
    "vulnerable-ghost-reachable": True,  
    "pills-remaining": True,             
    "powerpill-reachable": False,        
}


def load_graph():
    """Laedt Schema und Instanzdaten in einen Graphen."""
    graph = Graph()
    for ttl in TTL_FILES:
        if not ttl.is_file():
            print(f"FEHLER: Datei nicht gefunden: {ttl}")
            sys.exit(1)
        graph.parse(ttl, format="turtle")
    return graph


def main():
    graph = load_graph()
    print(f"Graph geladen: {len(graph)} Triples aus {len(TTL_FILES)} Turtle-Dateien.\n")

    print(f"{'Query':<28} {'erwartet':<10} {'tatsaechlich':<14} Status")
    print("-" * 64)

    failures = 0
    for name in sorted(EXPECTED):
        expected = EXPECTED[name]
        query_file = SPARQL_DIR / f"{name}.rq"

        if not query_file.is_file():
            print(f"{name:<28} {str(expected):<10} {'-':<14} FEHLER (Datei fehlt)")
            failures += 1
            continue

        try:
            actual = bool(graph.query(query_file.read_text(encoding="utf-8")).askAnswer)
        except Exception as exc:  # Syntaxfehler in der Query o.ae.
            print(f"{name:<28} {str(expected):<10} {'-':<14} FEHLER ({exc})")
            failures += 1
            continue

        ok = actual == expected
        if not ok:
            failures += 1
        print(f"{name:<28} {str(expected):<10} {str(actual):<14} {'OK' if ok else 'FEHLER'}")

    total = len(EXPECTED)
    print("-" * 64)
    if failures:
        print(f"Zusammenfassung: {total - failures}/{total} OK, {failures} FEHLER.")
        return 1

    print(f"Zusammenfassung: {total}/{total} OK - alle Queries liefern das erwartete Ergebnis.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
