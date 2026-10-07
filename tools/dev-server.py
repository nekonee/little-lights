#!/usr/bin/env python3
"""Lokalny serwer deweloperski: jak `python3 -m http.server`, ale bez cache'owania.

Zwykły serwer pozwala przeglądarce trzymać stare pliki CSS i JS, więc zmiany bywają niewidoczne
mimo odświeżenia strony. Nagłówek Cache-Control: no-store to wyłącza. Tylko do pracy lokalnej.
Uruchomienie: npm start (port 8000, adres http://localhost:8000)
"""
import http.server

PORT = 8000


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    http.server.test(HandlerClass=NoCacheHandler, port=PORT)
