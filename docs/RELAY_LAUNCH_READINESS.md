# RELAY: Zahlungen und öffentlicher Start

Stand: 11. Oktober 2026. RELAY ist ausschließlich für geschäftliche Nutzung durch Unternehmen vorgesehen. Bestätigt: Der bestehende VOVERE-Betreiber hat derzeit das Gewerbe Werbeagentur. Der Nutzer hat Paddle direkt ausgewählt und die öffentlichen VOVERE-Betreiberangaben als zutreffend bestätigt. Er bevorzugt zunächst einen kostenlosen Testbetrieb und fragt nach einer privaten Projektphase; die rechtliche Einordnung dieser konkreten Phase ist noch zu klären.

## Empfehlung

Paddle direkt integrieren, wenn internationale SaaS-Abos mit möglichst wenig eigener Umsatzsteuer-Abwicklung das Ziel sind. Paddle tritt beim Kauf als Merchant of Record auf. Die Standardgebühr beträgt 5 % plus 50 US-Cent je Checkout-Transaktion, ohne monatliche Grundgebühr. Eigene Buchhaltung, Ertragssteuern, Gewerberecht, Datenschutz und die Erbringung der Softwareleistung bleiben trotzdem Aufgaben des RELAY-Betreibers. [Paddle](https://www.paddle.com/pricing)

Standard-Stripe mit Stripe Billing ist die günstigere Alternative für Standardkarten aus dem EWR: 1,5 % plus EUR 0,25 Zahlungsgebühr und zusätzlich 0,7 % Billing-Gebühr im nutzungsabhängigen Modell. Auf EUR 29 Abrechnungsvolumen ergibt das rund EUR 0,89, auf EUR 79 rund EUR 1,99. Nur Rechenbeispiele: andere Karten, Währungsumrechnung, Steuern, Stripe Tax, Erstattungen und weitere Leistungen können die Kosten verändern. Standard-Stripe macht RELAY nicht automatisch zum steuerlich betreuten MoR-Verkauf; Stripe bietet daneben ein separates Managed-Payments-Modell. [Stripe Österreich](https://stripe.com/en-at/pricing)

Lovables eingebaute Zahlungsfunktion verlangt laut Dokumentation Pro oder höher. Die Integration eines eigenen Stripe-Kontos ist auch ohne bezahlten Lovable-Plan möglich. Eine selbst implementierte Paddle-Anbindung nutzt unsere vorhandenen Serverrouten; sie ist keine Aktivierung von Lovables eingebauter Payments-Funktion. Es wird kein Plan-Upgrade veranlasst. [Lovable Payments](https://docs.lovable.dev/features/payments), [eigene Stripe-Anbindung](https://docs.lovable.dev/integrations/stripe)

Unsere Produktdaten bleiben im bestehenden externen Supabase-Projekt. Der Zahlungsanbieter erhält die für Kauf und Abrechnung notwendigen Daten; Kartendaten verarbeitet dessen Checkout. Die native Lovable-Zahlungsintegration verwendet auch Lovable-Monitoring-Webhooks. Deshalb ist „alles liegt ausschließlich in Supabase“ keine zutreffende Beschreibung einer nativen Payments-Integration. Die Empfehlung ist eine direkte Anbindung.

## Abonnement pro Firma

Ein Abo gehört einem Company-Workspace, nicht einem einzelnen Mitarbeiter. Vorgesehener Ablauf:

1. Owner oder berechtigter Firmenadministrator öffnet Settings → Billing. Mitarbeiter ohne diese Berechtigung können keinen Vertrag für den Workspace ändern.
2. Der Server prüft die Supabase-Identität und Firmenmitgliedschaft. Er wählt den freigegebenen Preis aus einer serverseitigen Liste; der Browser liefert keine vertrauenswürdige Preis- oder Tarifentscheidung.
3. Der externe Checkout zeigt Firma, Laufzeit, Verlängerung, Endpreis, steuerliche Behandlung und die gültigen Vertragsbedingungen vor Abschluss an. Ein Firmenname und die Vertretungsbefugnis werden erfasst. Eine Checkbox allein macht einen privaten Kauf nicht zu einem B2B-Vertrag.
4. Ein signierter Anbieter-Webhook aktualisiert die Subscription und Nutzungsrechte in Supabase. Eine Weiterleitung auf eine „Erfolg“-Seite schaltet niemals selbst den Tarif frei.
5. Settings zeigt den tatsächlichen Tarif, Dokumentanzahl, belegten Speicher, Team-Limit, nächste Abrechnung und Kündigungsstatus. Das Anbieterportal ermöglicht Rechnungen, Zahlungsart und Kündigung.
6. Kündigung zum Laufzeitende und Downgrade löschen keine Dokumente. Verhalten oberhalb des neuen Limits, Export und die gesonderte Löschung werden vorher verständlich erläutert.

## Technische Abnahmekriterien für Billing

- Subscription, Checkout und Kunde werden serverseitig an die Workspace-ID gebunden; keine Zuordnung allein über die E-Mail eines Mitarbeiters.
- Getrennte Sandbox- und Live-IDs und Schlüssel. Keine geheimen Schlüssel in VITE-Variablen, Repository, Chat oder Browser.
- Provider-Signatur über den unveränderten Webhook-Body prüfen; gültige Ereignisse dauerhaft speichern und genau einmal wirksam anwenden. Nicht bestätigte oder unbekannte Preise niemals freischalten.
- Wiederholte und verspätete Webhooks, parallele Checkout-Klicks sowie veraltete Ereignisse dürfen keinen Doppelvertrag oder falschen Tarif erzeugen. Zustände mit dem Anbieter abgleichen und fehlgeschlagene Verarbeitung erneut versuchen.
- Ein Kunde mit mehreren Workspaces kann jeden Workspace separat verwalten. Der Wechsel eines Mitarbeiters oder seiner E-Mail überträgt kein Firmenabo.
- Zahlungsfehler, Mahnfrist, Kündigung, Erstattung und Rückbuchung separat behandeln. Keine automatische Vernichtung von Dateien bei Zahlungsproblemen.
- Speicher- und Teamgrenzen serverseitig durchsetzen, einschließlich Gast-Uploads und gleichzeitiger Uploads. Angaben aus dem Browser sind keine belastbare Speichermessung.
- Keine Dokumentinhalte an den Zahlungsanbieter senden. Audit-Ereignisse ohne Kartendaten oder vollständige geheime Webhook-Payloads.

Der Serveradapter, Checkout-/Webhook-Endpunkte, private Subscription-Tabellen, Workspace-Berechtigungsprüfung und dauerhafte Ereignisverarbeitung sind inzwischen implementiert. `tests/paddle-sandbox.mjs` und `tests/paddle-billing-worker.mjs` prüfen den Adapter und den gebauten Server mit lokalen Fixtures ohne Anbieteraufrufe. Zahlungen bleiben standardmäßig deaktiviert; eine echte Sandbox-Abnahme und die Freigabe des Live-Betriebs stehen aus. Quoten werden noch nicht serverseitig durchgesetzt. Die Preise in `RELAY_PRICING_MODEL.md` bleiben ein Vorschlag. Der aktuelle Implementierungsstand, Aktivierungsdaten und nächste Schritte stehen in `RELAY_PADDLE_SETUP.md`.

## Betreiber und Gewerbe

RELAY kann eine Produktmarke des bestehenden Einzelunternehmens sein; eine eigene GmbH ist dafür nicht automatisch erforderlich. Eine Produktmarke ersetzt jedoch keinen rechtlichen Betreiber. Kommerzieller SaaS-Vertrieb wird nicht allein dadurch zum privaten Projekt, dass er so genannt wird. Ob der konkrete RELAY-Betrieb von der bestehenden Werbeagentur-Berechtigung gedeckt ist oder eine weitere Berechtigung braucht, muss mit WKO bzw. Gewerbebehörde geklärt werden. Eine angebliche IT-Berechtigung wird nicht ins Impressum geschrieben. [USP: Gewerbeanmeldung](https://www.usp.gv.at/gruendung/EAP/gewerbeanmeldung.html)

Kostenloser Beta-Zugang und ausschließlich interne Entwicklung sind zu unterscheiden. Nach § 1 GewO zählt die Absicht eines Ertrags oder sonstigen wirtschaftlichen Vorteils, nicht erst der erste Zahlungseingang; auch öffentliches Anbieten kann bereits Gewerbeausübung sein. Deshalb ist ein später geplantes Abo kein belastbarer Grund, eine öffentliche kostenlose Beta pauschal als nicht gewerblich zu erklären. Interne Entwicklung mit eigenen Testdaten lässt sich weiterführen; vor dem Angebot an fremde Unternehmen die konkrete Beta mit der WKO klären. Datenschutzpflichten für echte Nutzer-/Firmendaten entfallen durch einen Preis von EUR 0 nicht. [GewO § 1, RIS](https://www.ris.bka.gv.at/geltendeFassung.wxe?Gesetzesnummer=10007517&abfrage=Bundesnormen)

Die Angaben aus dem öffentlichen [VOVERE-Impressum](https://vovere-studios.com/impressum) wurden vom Nutzer als zutreffend bestätigt. Sie sind als Betreiberbasis vorgesehen, falls RELAY über das bestehende Einzelunternehmen angeboten wird. UID, RELAY-Kontakt und weitere tatsächlich erforderliche Angaben sind noch zu vervollständigen. VOVERE selbst wurde nicht verändert. Provider-KYC, Auszahlungsdaten und Verträge müssen zur tatsächlich festgelegten Betreiberperson passen.

## Rechtspaket vor dem bezahlten Start

- Impressum mit zutreffendem Betreiber, Anschrift, Kontakt, einschlägigen Register-/Gewerbeangaben und UID, falls vorhanden.
- Datenschutzerklärung mit eigenen Account-/Abrechnungszwecken und der gesonderten Auftragsverarbeitung für Firmendokumente, tatsächlichen Empfängern, Datenregionen, Transfers, Speicherfristen und Betroffenenrechten.
- B2B-Nutzungs-/Abo-Bedingungen: Leistungsumfang, Firma als Vertragspartner, Mitarbeiterrollen, Preise, Verlängerung, Kündigung, Limits, Dokumentfreigaben, Vertragsende, Gewährleistung und Haftung.
- Verständliche Kündigungs- und Erstattungsregelung, abgestimmt mit dem ausgewählten Zahlungsanbieter. Für echte B2B-Verträge besteht nicht das verbraucherrechtliche 14-Tage-Fernabsatz-Widerrufsrecht. Das bedeutet keinen Ausschluss sämtlicher anderer Rechte. [WKO](https://www.wko.at/internetrecht/ruecktrittsrecht-bei-dienstleistungen-im-internet)
- Auftragsverarbeitungsvertrag einschließlich TOM, Unterauftragsverarbeitern, Weisungen, Unterstützung bei Betroffenenanfragen, Sicherheitsvorfällen und Datenrückgabe/-löschung. Firmenkunden sind häufig Verantwortliche für ihre hochgeladenen personenbezogenen Daten; RELAY verarbeitet diese in ihrem Auftrag. [WKO: Rollen](https://www.wko.at/dsgvo4kmu/verantwortlicher-auftragsverarbeiter)
- Vertragsannahme mit Version, Zeitpunkt und Firmenbezug sowie zugänglicher Vertragskopie. Gast-Uploads brauchen eine erreichbare Datenschutzerklärung, ohne unnötige Pflicht zur Account-Erstellung.

Interne Entwürfe: `legal/RELAY_LEGAL_DRAFTS.md`. Sie sind nicht öffentlich als fertige Rechtstexte veröffentlicht. Vor Veröffentlichung müssen offene Tatsachen ergänzt und die Klauseln für den tatsächlichen Betrieb fachlich geprüft werden.

## SEO umgesetzt in diesem Arbeitsstand

- Öffentliche Landingpage wird als vollständiges HTML serverseitig ausgeliefert, bevor die interaktive App geladen ist.
- Seitentitel, Beschreibung, kanonische URL, Open-Graph- und Twitter-Metadaten; Synchronisierung auch bei clientseitigem Wechsel zwischen Website und Workspace.
- Eigenes Social-Preview-Bild in 1200 × 630 mit RELAY-Typografie und der vorhandenen unveränderten VOVERE-Logo-SVG.
- Basis-JSON-LD für Website und Web-App ohne erfundene Bewertungen, Angebote oder Preise.
- `robots.txt` und eine Sitemap für die tatsächlich vorhandene öffentliche Landingpage und Preisseite.
- Workspace, Login, Gast-Upload- und Einladungsansichten bekommen `noindex`. Der Server ergänzt `X-Robots-Tag` für nicht öffentliche HTML-Routen sowie für Vorschau-/lokale Hosts. Das ersetzt keine Zugriffskontrolle. Private HTML-Routen bleiben crawlbar, damit Suchmaschinen `noindex` erkennen können. [Google](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)

Noch offen: Rechtsseiten veröffentlichen und verlinken; spätere echte Sprachversionen mit passenden hreflang-Angaben; Search-Console-Verifizierung und Sitemap-Einreichung für die Domain. Keine deutsche Sprachversion oder bereits funktionierende Bezahlfunktion wird durch Metadaten behauptet.

## Vor Launch noch überprüfen

Öffentliche Fassung auf der echten Domain nach Deploy prüfen; Login-Mailzustellung; Gast-/Firmen-Sharing einschließlich Bestätigungen; Rollen und Mandantentrennung; Export und Löschung; dokumentierte Aufbewahrung/Backups; Abuse-Limits für Uploads und Mail; tatsächliche Produktionsanbieter und Tracking; Last- und Wiederherstellungstests. Das aktuelle TypeScript-/Build-Ergebnis ist keine Aussage, dass tausende gleichzeitige Nutzer bereits lastgetestet sind.

Für den nächsten Schritt fehlen das Paddle-Sandbox-Konto mit sicher hinterlegten Integrationsdaten, die ergänzenden Betreiber-/Steuerdaten und das Ergebnis der Gewerbeprüfung. Keine Käufe, bezahlten Upgrades, neuen Anbieter-Verträge oder echten Zahlungen wurden in diesem Arbeitsstand veranlasst.
