"""Serveur local sans cache : le navigateur recharge toujours la dernière version des fichiers.

    python3 tools/serve.py        puis ouvrir http://localhost:8940
"""
import http.server, functools, pathlib

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

root = pathlib.Path(__file__).resolve().parent.parent
http.server.ThreadingHTTPServer(('', 8940), functools.partial(NoCache, directory=str(root))).serve_forever()
