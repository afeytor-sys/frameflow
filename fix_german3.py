#!/usr/bin/env python3
"""Fix remaining German text - batch 3 (components + lib)."""
import os

files = {
    'src/components/client-portal/ContractSigningClient.tsx': [
        ("toast.error(`Bitte f\u00fclle alle Felder aus: ${missing.map(getLabel).join(', ')}`)", "toast.error(`Please fill in all fields: ${missing.map(getLabel).join(', ')}`)"),
        ("toast.error('Bitte best\u00e4tige, dass du den Vertrag gelesen hast')", "toast.error('Please confirm that you have read the contract')"),
        ("toast.error('Bitte gib deinen vollst\u00e4ndigen Namen ein')", "toast.error('Please enter your full name')"),
        ('>Zur\u00fcck zum Portal\n', '>Back to portal\n'),
        ('>Zur\u00fcck\n', '>Back\n'),
        ('>Bitte f\u00fclle deine Angaben aus</h3>', '>Please fill in your details</h3>'),
    ],
    'src/components/client-portal/GalleryViewer.tsx': [
        ('>Bildgr\u00f6\u00dfe</p>', '>Image size</p>'),
        ('>Pr\u00e4sentation</span>', '>Slideshow</span>'),
        ('PR\u00c4SENTATIONSMODUS', 'SLIDESHOW MODE'),
    ],
    'src/components/client-portal/MoodBoard.tsx': [
        ('>Hinzuf\u00fcgen\n', '>Add\n'),
        ('F\u00fcge Bilder oder Links hinzu, die deinen Stil zeigen', 'Add images or links that show your style'),
        ('+ Erste Inspiration hinzuf\u00fcgen', '+ Add first inspiration'),
    ],
    'src/components/client-portal/PhotoComments.tsx': [
        ('title="Kommentar hinzuf\u00fcgen"', 'title="Add comment"'),
    ],
    'src/components/client-portal/PortalPasswordGate.tsx': [
        ('Dieses Portal ist passwortgesch\u00fctzt.<br />', 'This portal is password protected.<br />'),
        ('Portal \u00f6ffnen \u2192', 'Open portal \u2192'),
    ],
    'src/components/client-portal/WeatherWidget.tsx': [
        ("if (code <= 3) return 'Bew\u00f6lkt'", "if (code <= 3) return 'Cloudy'"),
    ],
    'src/components/dashboard/AnimatedStats.tsx': [
        ("label: 'Offene Vertr\u00e4ge'", "label: 'Open contracts'"),
    ],
    'src/components/dashboard/AnimatedStatsLight.tsx': [
        ("label: 'Offene Vertr\u00e4ge'", "label: 'Open contracts'"),
    ],
    'src/components/dashboard/BookingDetailsTab.tsx': [
        ('placeholder="z.B. Stadtpark M\u00fcnchen"', 'placeholder="e.g. Central Park, New York"'),
        ('>Treffpunkt (pr\u00e4zise)\n', '>Meeting point (precise)\n'),
        ('>Maps \u00f6ffnen\n', '>Open in Maps\n'),
        ('F\u00fcge einen Google Maps Link oder Koordinaten ein \u2014 wird dem Kunden als interaktive Karte angezeigt.', 'Add a Google Maps link or coordinates \u2014 shown to the client as an interactive map.'),
    ],
    'src/components/dashboard/ContractEditor.tsx': [
        ('title="Kundenfeld einf\u00fcgen"', 'title="Insert client field"'),
        ('>Kundenfeld einf\u00fcgen\n', '>Insert client field\n'),
        ('title="\u00dcberschrift 2"', 'title="Heading 2"'),
        ('title="\u00dcberschrift 3"', 'title="Heading 3"'),
        ('title="Aufz\u00e4hlung"', 'title="Bullet list"'),
        ('title="R\u00fckg\u00e4ngig"', 'title="Undo"'),
    ],
    'src/components/dashboard/ContractPDFDownload.tsx': [
        ("a.download = `${title.replace(/[^a-zA-Z0-9\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df\\s]/g, '').trim()}.pdf`", "a.download = `${title.replace(/[^a-zA-Z0-9\\s]/g, '').trim()}.pdf`"),
    ],
    'src/components/dashboard/ContractTab.tsx': [
        ('>Vollst\u00e4ndiger Name *\n', '>Full Name *\n'),
        ('placeholder="Dein vollst\u00e4ndiger Name"', 'placeholder="Your full name"'),
        ('>L\u00f6schen\n', '>Delete\n'),
        ("toast.error('Keine E-Mail-Adresse f\u00fcr diesen Kunden hinterlegt')", "toast.error('No email address found for this client')"),
        ("if (!confirm('Vertrag als unterschrieben markieren? Dies kann nicht r\u00fckg\u00e4ngig gemacht werden.')) return", "if (!confirm('Mark contract as signed? This cannot be undone.')) return"),
        ("if (!confirm('Vertrag wirklich l\u00f6schen?')) return", "if (!confirm('Really delete this contract?')) return"),
    ],
    'src/components/dashboard/DeliveryChecklist.tsx': [
        ("label: 'E-Mail des Kunden eingetragen'", "label: 'Client email entered'"),
        ("hint: 'Gehe zu Kunden \u2192 E-M", "hint: 'Go to Clients \u2192 E-M"),
        ('Portal bereit zum Versand \u2014 alles vollst\u00e4n', 'Portal ready to send \u2014 everything complete'),
    ],
    'src/components/dashboard/EmailVorlagePicker.tsx': [
        ('title="E-Mail Vorlage ausw\u00e4hlen"', 'title="Select email template"'),
        ("{label || 'Vorlage w\u00e4hlen'}", "{label || 'Select template'}"),
        ('>E-Mail Vorlage w\u00e4hlen\n', '>Select email template\n'),
        ('>Zur\u00fcck\n', '>Back\n'),
    ],
    'src/components/dashboard/GalleryTab.tsx': [
        ("if (!confirm(`${selected.size} ${selected.size === 1 ? 'Foto' : 'Fotos'} wirklich l\u00f6schen?`)) return", "if (!confirm(`Really delete ${selected.size} ${selected.size === 1 ? 'photo' : 'photos'}?`)) return"),
        ("toast.success(`${ids.length} ${ids.length === 1 ? 'Foto' : 'Fotos'} gel\u00f6scht`)", "toast.success(`${ids.length} ${ids.length === 1 ? 'photo' : 'photos'} deleted`)"),
        ("if (!confirm('Foto wirklich l\u00f6schen?')) return", "if (!confirm('Really delete this photo?')) return"),
        ("toast.success('Foto gel\u00f6scht')", "toast.success('Photo deleted')"),
        ("if (!confirm('Set l\u00f6schen? Fotos bleiben erhalten.')) return", "if (!confirm('Delete set? Photos will be kept.')) return"),
        ("toast.success('Set gel\u00f6scht')", "toast.success('Set deleted')"),
    ],
    'src/components/dashboard/PhotoUploader.tsx': [
        ("`${rejected.length} ${rejected.length === 1 ? 'Datei' : 'Dateien'} \u00fcbersprungen \u2014 Speicherlimit erreicht.`", "`${rejected.length} ${rejected.length === 1 ? 'file' : 'files'} skipped \u2014 storage limit reached.`"),
    ],
    'src/components/dashboard/PortalSettingsTab.tsx': [
        ("label: 'Wetter-Widget'", "label: 'Weather widget'"),
        ("description: 'Wettervorhersage f\u00fcr den Shooting-Tag'", "description: 'Weather forecast for the shoot day'"),
        ("description: 'Inspirationsboard f\u00fcr den Kunden'", "description: 'Inspiration board for the client'"),
        ("label: 'Galerie in Bearbeitung'", "label: 'Gallery in progress'"),
        ("text: 'Deine Fotos sind in Bearbeitung! Ich gebe mir die gr\u00f6\u00dfte", "text: 'Your photos are being edited! I am giving my best"),
        ("label: 'Shooting heute'", "label: 'Shoot today'"),
        ("text: 'Heute ist euer gro\u00dfer Tag! Ich bin aufgeregt und freue mich ries", "text: 'Today is your big day! I am excited and looking forward"),
        ('W\u00e4hle, welche Bereiche dein Kunde sieht \u2014 und schreibe eine pers\u00f6nliche Nachricht oder einen Update.', 'Choose which sections your client sees \u2014 and write a personal message or update.'),
        ('Portal in neuem Tab \u00f6ffnen', 'Open portal in new tab'),
    ],
    'src/components/dashboard/ProjectTabs.tsx': [
        ("if (!confirm('Galerie wirklich l\u00f6schen? Alle Fotos werden ebenfalls gel\u00f6scht.')) return", "if (!confirm('Really delete gallery? All photos will also be deleted.')) return"),
        ("toast.error('Fehler beim L\u00f6schen')", "toast.error('Error deleting')"),
        ("toast.success('Galerie gel\u00f6scht')", "toast.success('Gallery deleted')"),
        ('>Noch keine Galerie f\u00fcr dieses Projekt</p>', '>No gallery for this project yet</p>'),
        ('title="Galerie l\u00f6schen"', 'title="Delete gallery"'),
        ('>F\u00e4lligkeitsdatum\n', '>Due date\n'),
    ],
    'src/components/dashboard/QuestionnaireTab.tsx': [
        ("toast.error('Mindestens eine Frage hinzuf\u00fcgen')", "toast.error('Add at least one question')"),
        ('Vielen Dank f\u00fcr dein Interesse! Ich freue mich sehr auf unser gemeinsames Shooting.', 'Thank you for your interest! I am very much looking forward to our shoot together.'),
        ('Ich habe einen Fragebogen f\u00fcr dich vorbereitet: "${qTitle}"', 'I have prepared a questionnaire for you: "${qTitle}"'),
        ('Bitte nimm dir kurz Zeit, die Fragen zu beantworten \u2014 das hilft mir, alles perfekt f\u00fcr euch vorzubereiten.', 'Please take a moment to answer the questions \u2014 it helps me prepare everything perfectly for you.'),
        ('Liebe Gr\u00fc\u00dfe,', 'Best regards,'),
        ("toast.error('Bitte ein Datum ausw\u00e4hlen')", "toast.error('Please select a date')"),
    ],
    'src/components/dashboard/SlugEditor.tsx': [
        ("toast.error('Dieser Slug ist bereits vergeben \u2014 bitte einen anderen w\u00e4hlen')", "toast.error('This slug is already taken \u2014 please choose another one')"),
        ('title="Portal \u00f6ffnen"', 'title="Open portal"'),
    ],
    'src/components/dashboard/TimelineBuilder.tsx': [
        ('>Notiz f\u00fcr Kunden</lab', '>Note for client</lab'),
        ('placeholder="Sichtbar f\u00fcr den Kunden"', 'placeholder="Visible to the client"'),
        ('placeholder="Nur f\u00fcr dich sichtbar"', 'placeholder="Only visible to you"'),
        ("toast.success(exists ? 'Ereignis aktualisiert' : 'Ereignis hinzugef\u00fcgt')", "toast.success(exists ? 'Event updated' : 'Event added')"),
        ("if (!confirm('Ereignis wirklich l\u00f6schen?')) return", "if (!confirm('Really delete this event?')) return"),
        ("toast.success('Ereignis gel\u00f6scht')", "toast.success('Event deleted')"),
    ],
    'src/components/dashboard/UpgradeModal.tsx': [
        ("setInviteStatus({ ok: true, msg: data.message || '\U0001f389 Code eingel\u00f6st! Dein Plan wurde aktualisiert.' })", "setInviteStatus({ ok: true, msg: data.message || '\U0001f389 Code redeemed! Your plan has been updated.' })"),
        ("setInviteStatus({ ok: false, msg: data.error || 'Ung\u00fcltiger oder bereits verwendeter Code.' })", "setInviteStatus({ ok: false, msg: data.error || 'Invalid or already used code.' })"),
        ('>J\u00e4hrlich\n', '>Annual\n'),
        ('\U0001f389 <span style={{ color: \'#F59E0B\' }}>Launch-Angebot:</span> Die ersten <strong>2 Monate 50% g\u00fcnstiger</strong>', '\U0001f389 <span style={{ color: \'#F59E0B\' }}>Launch offer:</span> First <strong>2 months 50% off</strong>'),
        ('>Einladungscode einl\u00f6sen</span>', '>Redeem invite code</span>'),
        ('Hast du einen Einladungscode erhalten? L\u00f6se ihn hier ein und erh\u00e4lt', 'Have you received an invite code? Redeem it here and get'),
    ],
    'src/components/dashboard/WeatherWidget.tsx': [
        ("return { icon: Cloud,          label: 'Bew\u00f6lkt',      color: '#94A3B8' }", "return { icon: Cloud,          label: 'Cloudy',      color: '#94A3B8' }"),
        ("return { icon: Cloud, label: 'Bew\u00f6lkt', color: '#94A3B8' }", "return { icon: Cloud, label: 'Cloudy', color: '#94A3B8' }"),
    ],
    'src/components/marketing/FAQAccordion.tsx': [
        ("q: 'Ist die E-Signatur in Deutschland rechtsg\u00fcltig?'", "q: 'Is the e-signature legally valid?'"),
        ("a: 'Ja. Fotonizer verwendet eine einfache elektronische Signatur (eES) gem\u00e4\u00df eIDAS-Verordnung. F\u00fcr Fotografiev", "a: 'Yes. Fotonizer uses a simple electronic signature (SES) in accordance with the eIDAS regulation. For photography"),
        ("a: 'Du siehst ein freundliches Upgrade-Modal \u2014 keine Fehlermeldung. Du kannst bestehende Kunden weiterhin verw", "a: 'You will see a friendly upgrade modal \u2014 no error message. You can continue to manage existing clients"),
        ("q: 'K\u00f6nnen meine Kunden die Portale anderer Kunden sehen?'", "q: 'Can my clients see other clients\\' portals?'"),
        ("a: 'Nein. Jeder Kunde erh\u00e4lt einen einzigartigen, zuf\u00e4llig generierten Link (32 Zeichen). Ohne diesen Link ist", "a: 'No. Each client receives a unique, randomly generated link (32 characters). Without this link it is"),
        ("a: 'Fotos werden in Supabase Storage (EU-Region) gespeichert, solange dein Account aktiv ist. Du kannst Galeri", "a: 'Photos are stored in Supabase Storage (EU region) as long as your account is active. You can"),
    ],
    'src/components/marketing/PricingSection.tsx': [
        ("'Bis zu 2 Vertr\u00e4ge'", "'Up to 2 contracts'"),
        ("description: 'F\u00fcr wachsende Studios'", "description: 'For growing studios'"),
        ("'Bis zu 10 Vertr\u00e4ge'", "'Up to 10 contracts'"),
        ("cta: 'Starter w\u00e4hlen'", "cta: 'Choose Starter'"),
        ("description: 'F\u00fcr professionelle Fotografen'", "description: 'For professional photographers'"),
        ("'Unbegrenzte Vertr\u00e4ge'", "'Unlimited contracts'"),
    ],
    'src/lib/stripe.ts': [
        ("'Bis zu 10 Vertr\u00e4ge'", "'Up to 10 contracts'"),
        ("'Unbegrenzte Vertr\u00e4ge'", "'Unlimited contracts'"),
        ("'Priorit\u00e4ts-Support'", "'Priority support'"),
    ],
    'src/lib/emailTemplates.ts': [
        ("description: 'Professionelle E-Mail f\u00fcr den Rechnungsversand'", "description: 'Professional email for invoice delivery'"),
        ('anbei findest du deine Rechnung f\u00fcr das Projekt \u201e{{project_title}}\u201c.', 'please find attached your invoice for the project \u201c{{project_title}}\u201d.'),
        ('Bitte \u00fcberweise den Betrag bis zum angegebenen F\u00e4lligkeitsdatum. Bei Fragen stehe ich dir gerne zur Verf\u00fcgung.', 'Please transfer the amount by the specified due date. Feel free to contact me if you have any questions.'),
        ('Vielen Dank f\u00fcr dein Vertrauen!', 'Thank you for your trust!'),
        ('Herzliche Gr\u00fc\u00dfe,', 'Best regards,'),
        ('ich m\u00f6chte dich freundlich daran erinnern, dass noch eine Rechnung f\u00fcr das Projekt \u201e{{project_title}}\u201c offen i', 'I would like to kindly remind you that there is still an open invoice for the project \u201c{{project_title}}\u201d'),
    ],
    'src/lib/questionnaireTemplates.ts': [
        ("label: 'Wie lautet der vollst\u00e4ndige Name des Brautpaares?'", "label: 'What is the full name of the couple?'"),
        ("label: 'Wie viele G\u00e4ste werden erwartet?'", "label: 'How many guests are expected?'"),
        ("label: 'Habt ihr besondere W\u00fcnsche oder Ideen f\u00fcr die Fotos?'", "label: 'Do you have any special wishes or ideas for the photos?'"),
        ("label: 'Welchen Look/Stil m\u00f6chtest du?'", "label: 'What look/style do you want?'"),
        ("label: 'Welche Farben tr\u00e4gst du beim Shooting?'", "label: 'What colors will you wear at the shoot?'"),
        ("label: 'Gibt es K\u00f6rperstellen, die du lieber nicht zeigen m\u00f6chtest?'", "label: 'Are there any body parts you would prefer not to show?'"),
    ],
}

for filepath, replacements in files.items():
    if not os.path.exists(filepath):
        print(f'SKIP: {filepath}')
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated: {filepath}')
    else:
        print(f'No changes: {filepath}')

print('\nDone batch 3!')
