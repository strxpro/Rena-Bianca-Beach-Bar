# Szablony E-mail — Rena Bianca Beach Bar
## Plik konfiguracyjny dla Make.com

---

## CZĘŚĆ 1: E-mail do Właściciela (zawsze po włosku)

Wysyłany za każdym razem gdy ktoś wypełni formularz kontaktowy na stronie.

### Dane, które przychodzą z webhooka z Twojej strony:
- `name`
- `email`
- `message`
- `phone`
- `phoneDisplay`
- `dialCode`
- `phoneCountry`
- `phoneCountryIso`
- `language`
- `date`
- `source` = `site_contact`

### Webhook kontaktowy:
- `https://hook.eu1.make.com/vwa9gpe5djg1jujxd6cb78qgpo2dwn3v`

### Co oznacza `source`:
- `source = site_contact`
- to jest stały znacznik mówiący, że wiadomość przyszła z formularza kontaktowego na stronie
- w Google Sheets mapujesz to do kolumny `Fonte`

### Jeśli Make.com nie widzi nowych pól:
- po każdej zmianie payloadu kliknij w module webhooka **Redetermine data structure**
- potem kliknij **Run once**
- wyślij testowy formularz jeszcze raz ze strony
- dopiero wtedy w mapowaniu pojawią się np. `phoneDisplay`, `language`, `source` i `date`

### Ustawienia w Make.com:
- **To:** `info@renabiancabeachbar.com`
- **From:** `info@renabiancabeachbar.com` (jeśli Twój provider pozwala) lub domyślny adres Gmail/SMTP
- **Subject:** `📩 Nuovo messaggio da {{name}} — Rena Bianca`
- **Content type:** HTML

### Mapowanie do Twojego arkusza Google Sheets `Contatto`:
- `Nome` ← `name`
- `Email` ← `email`
- `Numero` ← `phone`
- `Messaggio` ← `message`
- `Paese` ← `language` *(jeśli chcesz, możesz zmienić nazwę kolumny na `Lingua`, bo strona wysyła język strony)*
- `Data` ← `date`
- `Fonte` ← `source`

Jeśli chcesz, możesz też dodać dodatkowe kolumny w arkuszu:
- `Prefisso` ← `dialCode`
- `Paese telefono` ← `phoneCountry`
- `ISO telefonu` ← `phoneCountryIso`

### Treść HTML (wklej do pola Content w Make.com):

```html
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Nuovo messaggio — Rena Bianca</title>
<style>
  body { margin: 0; padding: 0; background: #0A192F; font-family: Georgia, 'Times New Roman', serif; }
  .wrap { max-width: 600px; margin: 0 auto; background: #0d2240; border-radius: 12px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #0A192F 0%, #1a4a6e 50%, #3B82C4 100%); padding: 40px 32px; text-align: center; }
  .header h1 { margin: 0; color: #e8dcc8; font-size: 28px; font-weight: 400; letter-spacing: 0.05em; }
  .header p { margin: 8px 0 0; color: rgba(232,220,200,0.5); font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; }
  .body { padding: 32px; }
  .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: rgba(59,130,196,0.7); margin-bottom: 4px; font-family: Arial, sans-serif; }
  .value { font-size: 15px; color: #e8dcc8; margin-bottom: 24px; line-height: 1.6; border-left: 2px solid rgba(59,130,196,0.3); padding-left: 12px; }
  .divider { height: 1px; background: linear-gradient(90deg, rgba(59,130,196,0.3), transparent); margin: 8px 0 24px; }
  .footer { background: #091628; padding: 20px 32px; text-align: center; font-family: Arial, sans-serif; }
  .footer p { margin: 0; color: rgba(232,220,200,0.25); font-size: 11px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>Rena Bianca</h1>
    <p>Nuovo messaggio dal sito web</p>
  </div>
  <div class="body">
    <div class="label">Nome</div>
    <div class="value">{{1.name}}</div>

    <div class="label">Email</div>
    <div class="value"><a href="mailto:{{1.email}}" style="color:#3B82C4;">{{1.email}}</a></div>

    <div class="label">Telefono</div>
    <div class="value">{{1.phoneDisplay}}</div>

    <div class="divider"></div>

    <div class="label">Messaggio</div>
    <div class="value">{{1.message}}</div>

    <div class="divider"></div>

    <div class="label">Data</div>
    <div class="value">{{1.date}}</div>

    <div class="label">Lingua del cliente</div>
    <div class="value">{{1.language}}</div>
  </div>
  <div class="footer">
    <p>© 2026 Rena Bianca Beach Bar · Spiaggia di Rena Bianca, Santa Teresa Gallura, Sardegna</p>
  </div>
</div>
</body>
</html>
```

---

## CZĘŚĆ 2: E-mail potwierdzający dla Klienta (w jego języku)

W Make.com stwórz **Router** za modułem Google Sheets.
Każda gałąź Routera filtruje według pola `{{language}}`.

### Jak skonfigurować Router:
1. Kliknij ikonkę narzędzi na strzałce wychodzącą z Webhooka → **Add router**.
2. Dodaj osobną gałąź dla każdego języka.
3. W każdej gałęzi kliknij filtr (ikona lejka) i ustaw:
   - `language` **Equal to** `it` (lub `pl`, `en`, itd.)
4. Dodaj moduł **Gmail → Send an Email** w każdej gałęzi.
5. W polu **To** wstaw zmienną: `{{email}}`
6. Jeśli chcesz fallback, dodaj osobną ostatnią gałąź z filtrem typu `language is empty` albo `language is not equal to it/pl/en/fr/de/es` i użyj tam wersji angielskiej.

---

### 🇮🇹 ITALIANO (language = "it")

**Subject:** `Grazie per averci contattato — Rena Bianca`

```html
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#040c18;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(160deg,#04090f 0%,#071625 50%,#0b2540 100%)"><tr><td align="center" style="padding:36px 16px 52px">
<table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:24px;overflow:hidden">
<tr><td style="padding:44px 40px 36px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07)">
<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px"><tr><td style="background:rgba(255,255,255,0.92);border-radius:10px;padding:10px 28px"><img src="https://www.renabiancabeachbar.com/logo.svg" alt="Rena Bianca Beach Bar" width="200" height="67" style="display:block" /></td></tr></table>
<div style="color:rgba(232,220,200,0.35);font-size:9px;letter-spacing:0.3em;text-transform:uppercase">Beach Bar &middot; Sardegna</div>
</td></tr>
<tr><td style="padding:44px 44px 40px">
<div style="font-size:20px;color:#e8dcc8;font-weight:400;font-family:Georgia,'Times New Roman',serif;margin:0 0 22px;line-height:1.4">Caro/a {{1.name}},</div>
<div style="font-size:14px;color:rgba(200,220,240,0.80);line-height:1.9;margin:0 0 32px">Grazie per averci contattato. Abbiamo ricevuto il tuo messaggio e ti risponderemo al più presto.</div>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 32px"><tr><td style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.09);border-left:2px solid #62a4e8;padding:18px 22px;border-radius:0 14px 14px 0">
<div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.22em;color:#62a4e8;margin-bottom:10px">Il tuo messaggio</div>
<div style="font-size:14px;color:rgba(200,220,240,0.75);line-height:1.75;font-style:italic">{{1.message}}</div>
</td></tr></table>
<div style="font-size:14px;color:rgba(200,220,240,0.80);line-height:1.9;margin:0 0 44px">Nel frattempo, ti invitiamo a scoprire il nostro menu estivo e a prenotare il tuo tavolo vista mare.</div>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:rgba(255,255,255,0.10);border:1.5px solid rgba(255,255,255,0.25);border-radius:50px"><a href="https://www.renabiancabeachbar.com" style="display:inline-block;padding:14px 42px;color:#e8dcc8;text-decoration:none;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600">Visita il nostro sito</a></td></tr></table>
</td></tr>
<tr><td style="padding:20px 44px;text-align:center;border-top:1px solid rgba(255,255,255,0.07)">
<div style="font-size:10px;color:rgba(200,220,240,0.22);line-height:1.6">&copy; 2026 Rena Bianca Beach Bar &middot; Spiaggia di Rena Bianca, Santa Teresa Gallura, Sardegna</div>
</td></tr>
</table>
</td></tr></table>
</body></html>
```

---

### POLSKI (language = "pl")

**Subject:** `Dziękujemy za wiadomość — Rena Bianca`

```html
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#040c18;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(160deg,#04090f 0%,#071625 50%,#0b2540 100%)"><tr><td align="center" style="padding:36px 16px 52px">
<table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:24px;overflow:hidden">
<tr><td style="padding:44px 40px 36px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07)">
<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px"><tr><td style="background:rgba(255,255,255,0.92);border-radius:10px;padding:10px 28px"><img src="https://www.renabiancabeachbar.com/logo.svg" alt="Rena Bianca Beach Bar" width="200" height="67" style="display:block" /></td></tr></table>
<div style="color:rgba(232,220,200,0.35);font-size:9px;letter-spacing:0.3em;text-transform:uppercase">Beach Bar &middot; Sardynia</div>
</td></tr>
<tr><td style="padding:44px 44px 40px">
<div style="font-size:20px;color:#e8dcc8;font-weight:400;font-family:Georgia,'Times New Roman',serif;margin:0 0 22px;line-height:1.4">Drogi/a {{1.name}},</div>
<div style="font-size:14px;color:rgba(200,220,240,0.80);line-height:1.9;margin:0 0 32px">Dziękujemy za kontakt. Otrzymaliśmy Twoją wiadomość i odpiszemy tak szybko, jak to możliwe.</div>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 32px"><tr><td style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.09);border-left:2px solid #62a4e8;padding:18px 22px;border-radius:0 14px 14px 0">
<div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.22em;color:#62a4e8;margin-bottom:10px">Twoja wiadomość</div>
<div style="font-size:14px;color:rgba(200,220,240,0.75);line-height:1.75;font-style:italic">{{1.message}}</div>
</td></tr></table>
<div style="font-size:14px;color:rgba(200,220,240,0.80);line-height:1.9;margin:0 0 44px">W międzyczasie zapraszamy do odkrycia naszego letniego menu i rezerwacji stolika z widokiem na morze.</div>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:rgba(255,255,255,0.10);border:1.5px solid rgba(255,255,255,0.25);border-radius:50px"><a href="https://www.renabiancabeachbar.com" style="display:inline-block;padding:14px 42px;color:#e8dcc8;text-decoration:none;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600">Odwiedź naszą stronę</a></td></tr></table>
</td></tr>
<tr><td style="padding:20px 44px;text-align:center;border-top:1px solid rgba(255,255,255,0.07)">
<div style="font-size:10px;color:rgba(200,220,240,0.22);line-height:1.6">&copy; 2026 Rena Bianca Beach Bar &middot; Spiaggia di Rena Bianca, Santa Teresa Gallura, Sardynia</div>
</td></tr>
</table>
</td></tr></table>
</body></html>
```

---

### ENGLISH (language = "en")

**Subject:** `Thank you for your message — Rena Bianca`

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#040c18;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(160deg,#04090f 0%,#071625 50%,#0b2540 100%)"><tr><td align="center" style="padding:36px 16px 52px">
<table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:24px;overflow:hidden">
<tr><td style="padding:44px 40px 36px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07)">
<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px"><tr><td style="background:rgba(255,255,255,0.92);border-radius:10px;padding:10px 28px"><img src="https://www.renabiancabeachbar.com/logo.svg" alt="Rena Bianca Beach Bar" width="200" height="67" style="display:block" /></td></tr></table>
<div style="color:rgba(232,220,200,0.35);font-size:9px;letter-spacing:0.3em;text-transform:uppercase">Beach Bar &middot; Sardinia</div>
</td></tr>
<tr><td style="padding:44px 44px 40px">
<div style="font-size:20px;color:#e8dcc8;font-weight:400;font-family:Georgia,'Times New Roman',serif;margin:0 0 22px;line-height:1.4">Dear {{1.name}},</div>
<div style="font-size:14px;color:rgba(200,220,240,0.80);line-height:1.9;margin:0 0 32px">Thank you for reaching out. We have received your message and will get back to you as soon as possible.</div>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 32px"><tr><td style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.09);border-left:2px solid #62a4e8;padding:18px 22px;border-radius:0 14px 14px 0">
<div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.22em;color:#62a4e8;margin-bottom:10px">Your message</div>
<div style="font-size:14px;color:rgba(200,220,240,0.75);line-height:1.75;font-style:italic">{{1.message}}</div>
</td></tr></table>
<div style="font-size:14px;color:rgba(200,220,240,0.80);line-height:1.9;margin:0 0 44px">In the meantime, we invite you to explore our summer menu and reserve your table with a sea view.</div>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:rgba(255,255,255,0.10);border:1.5px solid rgba(255,255,255,0.25);border-radius:50px"><a href="https://www.renabiancabeachbar.com" style="display:inline-block;padding:14px 42px;color:#e8dcc8;text-decoration:none;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600">Visit our website</a></td></tr></table>
</td></tr>
<tr><td style="padding:20px 44px;text-align:center;border-top:1px solid rgba(255,255,255,0.07)">
<div style="font-size:10px;color:rgba(200,220,240,0.22);line-height:1.6">&copy; 2026 Rena Bianca Beach Bar &middot; Spiaggia di Rena Bianca, Santa Teresa Gallura, Sardinia</div>
</td></tr>
</table>
</td></tr></table>
</body></html>
```

---

### FRANÇAIS (language = "fr")

**Subject:** `Merci pour votre message — Rena Bianca`

```html
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#040c18;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(160deg,#04090f 0%,#071625 50%,#0b2540 100%)"><tr><td align="center" style="padding:36px 16px 52px">
<table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:24px;overflow:hidden">
<tr><td style="padding:44px 40px 36px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07)">
<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px"><tr><td style="background:rgba(255,255,255,0.92);border-radius:10px;padding:10px 28px"><img src="https://www.renabiancabeachbar.com/logo.svg" alt="Rena Bianca Beach Bar" width="200" height="67" style="display:block" /></td></tr></table>
<div style="color:rgba(232,220,200,0.35);font-size:9px;letter-spacing:0.3em;text-transform:uppercase">Beach Bar &middot; Sardaigne</div>
</td></tr>
<tr><td style="padding:44px 44px 40px">
<div style="font-size:20px;color:#e8dcc8;font-weight:400;font-family:Georgia,'Times New Roman',serif;margin:0 0 22px;line-height:1.4">Cher/Chère {{1.name}},</div>
<div style="font-size:14px;color:rgba(200,220,240,0.80);line-height:1.9;margin:0 0 32px">Merci de nous avoir contactés. Nous avons bien reçu votre message et vous répondrons dès que possible.</div>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 32px"><tr><td style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.09);border-left:2px solid #62a4e8;padding:18px 22px;border-radius:0 14px 14px 0">
<div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.22em;color:#62a4e8;margin-bottom:10px">Votre message</div>
<div style="font-size:14px;color:rgba(200,220,240,0.75);line-height:1.75;font-style:italic">{{1.message}}</div>
</td></tr></table>
<div style="font-size:14px;color:rgba(200,220,240,0.80);line-height:1.9;margin:0 0 44px">En attendant, nous vous invitons à découvrir notre menu estival et à réserver votre table avec vue sur la mer.</div>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:rgba(255,255,255,0.10);border:1.5px solid rgba(255,255,255,0.25);border-radius:50px"><a href="https://www.renabiancabeachbar.com" style="display:inline-block;padding:14px 42px;color:#e8dcc8;text-decoration:none;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600">Visiter notre site</a></td></tr></table>
</td></tr>
<tr><td style="padding:20px 44px;text-align:center;border-top:1px solid rgba(255,255,255,0.07)">
<div style="font-size:10px;color:rgba(200,220,240,0.22);line-height:1.6">&copy; 2026 Rena Bianca Beach Bar &middot; Spiaggia di Rena Bianca, Santa Teresa Gallura, Sardaigne</div>
</td></tr>
</table>
</td></tr></table>
</body></html>
```

---

### DEUTSCH (language = "de")

**Subject:** `Vielen Dank für Ihre Nachricht — Rena Bianca`

```html
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#040c18;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(160deg,#04090f 0%,#071625 50%,#0b2540 100%)"><tr><td align="center" style="padding:36px 16px 52px">
<table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:24px;overflow:hidden">
<tr><td style="padding:44px 40px 36px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07)">
<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px"><tr><td style="background:rgba(255,255,255,0.92);border-radius:10px;padding:10px 28px"><img src="https://www.renabiancabeachbar.com/logo.svg" alt="Rena Bianca Beach Bar" width="200" height="67" style="display:block" /></td></tr></table>
<div style="color:rgba(232,220,200,0.35);font-size:9px;letter-spacing:0.3em;text-transform:uppercase">Beach Bar &middot; Sardinien</div>
</td></tr>
<tr><td style="padding:44px 44px 40px">
<div style="font-size:20px;color:#e8dcc8;font-weight:400;font-family:Georgia,'Times New Roman',serif;margin:0 0 22px;line-height:1.4">Liebe/r {{1.name}},</div>
<div style="font-size:14px;color:rgba(200,220,240,0.80);line-height:1.9;margin:0 0 32px">Vielen Dank für Ihre Nachricht. Wir haben sie erhalten und werden uns so schnell wie möglich bei Ihnen melden.</div>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 32px"><tr><td style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.09);border-left:2px solid #62a4e8;padding:18px 22px;border-radius:0 14px 14px 0">
<div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.22em;color:#62a4e8;margin-bottom:10px">Ihre Nachricht</div>
<div style="font-size:14px;color:rgba(200,220,240,0.75);line-height:1.75;font-style:italic">{{1.message}}</div>
</td></tr></table>
<div style="font-size:14px;color:rgba(200,220,240,0.80);line-height:1.9;margin:0 0 44px">In der Zwischenzeit laden wir Sie ein, unsere Sommerspeisekarte zu entdecken und Ihren Tisch mit Meerblick zu reservieren.</div>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:rgba(255,255,255,0.10);border:1.5px solid rgba(255,255,255,0.25);border-radius:50px"><a href="https://www.renabiancabeachbar.com" style="display:inline-block;padding:14px 42px;color:#e8dcc8;text-decoration:none;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600">Unsere Website besuchen</a></td></tr></table>
</td></tr>
<tr><td style="padding:20px 44px;text-align:center;border-top:1px solid rgba(255,255,255,0.07)">
<div style="font-size:10px;color:rgba(200,220,240,0.22);line-height:1.6">&copy; 2026 Rena Bianca Beach Bar &middot; Spiaggia di Rena Bianca, Santa Teresa Gallura, Sardinien</div>
</td></tr>
</table>
</td></tr></table>
</body></html>
```

---

### ESPAÑOL (language = "es")

**Subject:** `Gracias por su mensaje — Rena Bianca`

```html
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#040c18;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(160deg,#04090f 0%,#071625 50%,#0b2540 100%)"><tr><td align="center" style="padding:36px 16px 52px">
<table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:24px;overflow:hidden">
<tr><td style="padding:44px 40px 36px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07)">
<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px"><tr><td style="background:rgba(255,255,255,0.92);border-radius:10px;padding:10px 28px"><img src="https://www.renabiancabeachbar.com/logo.svg" alt="Rena Bianca Beach Bar" width="200" height="67" style="display:block" /></td></tr></table>
<div style="color:rgba(232,220,200,0.35);font-size:9px;letter-spacing:0.3em;text-transform:uppercase">Beach Bar &middot; Cerdeña</div>
</td></tr>
<tr><td style="padding:44px 44px 40px">
<div style="font-size:20px;color:#e8dcc8;font-weight:400;font-family:Georgia,'Times New Roman',serif;margin:0 0 22px;line-height:1.4">Estimado/a {{1.name}},</div>
<div style="font-size:14px;color:rgba(200,220,240,0.80);line-height:1.9;margin:0 0 32px">&iexcl;Gracias por contactarnos! Hemos recibido su mensaje y le responderemos lo antes posible.</div>
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 32px"><tr><td style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.09);border-left:2px solid #62a4e8;padding:18px 22px;border-radius:0 14px 14px 0">
<div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.22em;color:#62a4e8;margin-bottom:10px">Su mensaje</div>
<div style="font-size:14px;color:rgba(200,220,240,0.75);line-height:1.75;font-style:italic">{{1.message}}</div>
</td></tr></table>
<div style="font-size:14px;color:rgba(200,220,240,0.80);line-height:1.9;margin:0 0 44px">Mientras tanto, le invitamos a descubrir nuestro menú de verano y reservar su mesa con vistas al mar.</div>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:rgba(255,255,255,0.10);border:1.5px solid rgba(255,255,255,0.25);border-radius:50px"><a href="https://www.renabiancabeachbar.com" style="display:inline-block;padding:14px 42px;color:#e8dcc8;text-decoration:none;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600">Visitar nuestra web</a></td></tr></table>
</td></tr>
<tr><td style="padding:20px 44px;text-align:center;border-top:1px solid rgba(255,255,255,0.07)">
<div style="font-size:10px;color:rgba(200,220,240,0.22);line-height:1.6">&copy; 2026 Rena Bianca Beach Bar &middot; Spiaggia di Rena Bianca, Santa Teresa Gallura, Cerdeña</div>
</td></tr>
</table>
</td></tr></table>
</body></html>
```

---

## CZĘŚĆ 3: Schemat Make.com — Diagram przepływu

```
[Webhook: Formularz Kontaktowy]
         ↓
[Google Sheets: Add a Row → Arkusz "Kontakty"]   ← opcjonalny backup
         ↓
[Gmail: Wyślij e-mail DO WŁAŚCICIELA]
         ↓
      [Router]
     /   |   |   |   |   \
   it   pl  en  fr  de   es
    ↓    ↓   ↓   ↓   ↓    ↓
[Gmail do klienta w jego języku]
```

> [!IMPORTANT]
> Pamiętaj żeby w każdym module Gmail dla klienta pole **"To"** zawierało zmienną `{{email}}` z webhookowego payloadu — dzięki temu klient dostaje automatyczną odpowiedź na swój adres.

> [!TIP]
> Możesz też zostawić tylko Router bez Google Sheets jeśli nie potrzebujesz backupu wiadomości w arkuszu.
