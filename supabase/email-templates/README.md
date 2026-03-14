# Fotonizer — E-Mail Templates für Supabase

Zwei angepasste HTML-E-Mail-Templates im Fotonizer-Design (dunkles Theme, goldener Akzent).

---

## 📁 Dateien

| Datei | Verwendung |
|---|---|
| `confirm-signup.html` | Bestätigungs-E-Mail bei Registrierung |
| `reset-password.html` | Passwort-zurücksetzen-E-Mail |

---

## 🚀 Schritt-für-Schritt: Im Supabase Dashboard einrichten

### 1. Supabase Dashboard öffnen
→ https://supabase.com/dashboard → dein Projekt auswählen

### 2. Zu den E-Mail-Templates navigieren
**Authentication** → **Email Templates** (linke Seitenleiste)

### 3. Template "Confirm signup" anpassen
1. Klicke auf **"Confirm signup"**
2. **Subject** ändern zu:
   ```
   Bestätige deine E-Mail-Adresse – Fotonizer
   ```
3. Den gesamten Inhalt des **Body** löschen
4. Den Inhalt von `confirm-signup.html` hineinkopieren
5. Auf **"Save"** klicken

### 4. Template "Reset Password" anpassen
1. Klicke auf **"Reset Password"**
2. **Subject** ändern zu:
   ```
   Passwort zurücksetzen – Fotonizer
   ```
3. Den gesamten Inhalt des **Body** löschen
4. Den Inhalt von `reset-password.html` hineinkopieren
5. Auf **"Save"** klicken

---

## 🔧 Verwendete Supabase-Variablen

| Variable | Bedeutung |
|---|---|
| `{{ .ConfirmationURL }}` | Der einmalige Bestätigungs-/Reset-Link |
| `{{ .SiteURL }}` | Die URL deiner App (z.B. https://fotonizer.de) |
| `{{ .Email }}` | Die E-Mail-Adresse des Nutzers |

---

## ⚡ Empfehlung: Eigenen SMTP-Server einrichten

Das Supabase Free-Plan hat ein Limit von **3 E-Mails pro Stunde**. Für den Produktionsbetrieb empfehle ich einen eigenen SMTP-Dienst:

### Option 1: Resend (empfohlen — kostenlos bis 3.000/Monat)
1. Account erstellen auf https://resend.com
2. Domain verifizieren
3. API-Key erstellen
4. In Supabase: **Project Settings** → **Auth** → **SMTP Settings**
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **User:** `resend`
   - **Password:** dein Resend API-Key
   - **Sender email:** `noreply@deine-domain.de`
   - **Sender name:** `Fotonizer`

### Option 2: SendGrid
- Host: `smtp.sendgrid.net`
- Port: `587`
- User: `apikey`
- Password: dein SendGrid API-Key

---

## 🎨 Design-Details

- **Hintergrund:** `#0F0F0F` (fast schwarz)
- **Card:** `#1A1A1A` mit `#2A2A2A` Border
- **Akzentfarbe:** `#C4A47C` (Gold)
- **Text:** `#F5F5F3` (hell) / `#9CA3AF` (gedimmt)
- **Button:** Goldener Hintergrund, schwarzer Text
- Vollständig kompatibel mit Gmail, Outlook, Apple Mail
