#!/usr/bin/env python3
"""Fix remaining German text - batch 2."""
import os

files = {
    'src/app/(dashboard)/dashboard/questionnaires/page.tsx': [
        ('Fragebgen', 'Questionnaires'),
        ('Frage hinzuf\u00fcgen', 'Add question'),
    ],
    'src/app/(dashboard)/dashboard/invoices/InvoicesClient.tsx': [
        ('>F\u00e4llig am:</span>', '>Due on:</span>'),
        ('>Bankverbindung \u2014 Bitte \u00fcberweisen Sie den Betrag auf folgendes Konto:', '>Bank details \u2014 Please transfer the amount to the following account:'),
        ('Vielen Dank f\u00fcr Ihr Vertrauen! \u00b7 {photographer?.studio_name || photographer?.full_name || \'Fotonizer\'}', 'Thank you for your trust! \u00b7 {photographer?.studio_name || photographer?.full_name || \'Fotonizer\'}'),
        ('>Schlie\u00dfen\n              </button>', '>Close\n              </button>'),
        ("toast.error('Bitte ein Projekt ausw\u00e4hlen')", "toast.error('Please select a project')"),
        ("toast.error('Kein Kunde oder keine E-Mail-Adresse f\u00fcr dieses Projekt hinterlegt.')", "toast.error('No client or email address found for this project.')"),
        ("if (!confirm('Rechnung l\u00f6schen?')) return", "if (!confirm('Delete invoice?')) return"),
        ("toast.success('Rechnung gel\u00f6scht')", "toast.success('Invoice deleted')"),
        ("totalOverdue > 0 ? 'Sofort nachfassen!' : 'Alles im gr\u00fcnen Bereich'", "totalOverdue > 0 ? 'Follow up immediately!' : 'All good'"),
        ("label: 'MwSt. bezahlt'", "label: 'VAT paid'"),
        ("desc: 'Gesch\u00e4tzte 19% MwSt.'", "desc: 'Estimated 19% VAT'"),
        ('Erstelle deine erste Rechnung und behalte deine Zahlungen im \u00dcberblick', 'Create your first invoice and keep track of your payments'),
        ("toLocaleDateString('de-DE')", "toLocaleDateString('en-US')"),
        ('>Als \u00fcberf\u00e4llig markieren\n', '>Mark as overdue\n'),
        ('>L\u00f6schen\n                          </button>', '>Delete\n                          </button>'),
        ('<option value="">Projekt ausw\u00e4hlen...</option>', '<option value="">Select project...</option>'),
        ('placeholder="Interne Notizen oder Hinweise f\u00fcr den Kunden..."', 'placeholder="Internal notes or hints for the client..."'),
        ('>F\u00e4lligkeitsdatum\n', '>Due date\n'),
        ("` \u00b7 F\u00e4llig ${new Date(createdInvoice.due_date).toLocaleDateString('de-DE')}`", "` \u00b7 Due ${new Date(createdInvoice.due_date).toLocaleDateString('en-US')}`"),
        ('label="Vorlage w\u00e4hlen"', 'label="Select template"'),
        ('Der Rechnungslink wird automatisch im E-Mail hinzugef\u00fcgt.', 'The invoice link will be automatically added to the email.'),
        ('\u26a0\ufe0f Kein Kunde oder keine E-Mail-Adresse f\u00fcr dieses Projekt hinterlegt.', '\u26a0\ufe0f No client or email address found for this project.'),
        ('>Sp\u00e4ter\n', '>Later\n'),
    ],
    'src/app/(dashboard)/dashboard/contracts/ContractsClient.tsx': [
        ('>Vertr\u00e4ge\n            </h1>', '>Contracts\n            </h1>'),
        ("contracts.length === 1 ? 'Vertrag' : 'Vertr\u00e4ge'", "contracts.length === 1 ? 'Contract' : 'Contracts'"),
        ('\u00b7 Erstelle und verwalte Kundenvertr\u00e4ge', '\u00b7 Create and manage client contracts'),
        ('title="Vorlage l\u00f6schen"', 'title="Delete template"'),
        ('>Meine Vertr\u00e4ge\n', '>My Contracts\n'),
        ('>Noch keine Vertr\u00e4ge</h3>', '>No contracts yet</h3>'),
        ('W\u00e4hle eine Vorlage oben aus oder erstelle einen neuen Vertrag.', 'Select a template above or create a new contract.'),
        ('<option value="">Projekt ausw\u00e4hlen...</option>', '<option value="">Select project...</option>'),
        ('>Schlie\u00dfen</button>', '>Close</button>'),
    ],
    'src/app/(dashboard)/dashboard/projects/new/page.tsx': [
        ('>Zur\u00fcck\n              </Link>', '>Back\n              </Link>'),
    ],
    'src/app/(dashboard)/dashboard/projects/page.tsx': [
        ('Filter zur\u00fccksetzen', 'Reset filter'),
        ('title="Projekt l\u00f6schen"', 'title="Delete project"'),
        ('title="\u00d6ffnen"', 'title="Open"'),
        ('title="L\u00f6schen"', 'title="Delete"'),
    ],
    'src/app/(dashboard)/dashboard/email-vorlagen/EmailVorlagenClient.tsx': [
        ('>Schlie\u00dfen\n', '>Close\n'),
        ('title={`${ph} einf\u00fcgen`}', 'title={`Insert ${ph}`}'),
        ('placeholder={`Hallo {{client_name}},\\n\\ndeine Fotos sind fertig!\\n\\n{{portal_url}}\\n\\nHerzliche Gr\u00fc\u00dfe,\\n{{studio_name}}`}', 'placeholder={`Hello {{client_name}},\\n\\nyour photos are ready!\\n\\n{{portal_url}}\\n\\nBest regards,\\n{{studio_name}}`}'),
        ('Klicke auf einen Platzhalter-Button um ihn einzuf\u00fcgen. Zeilenumbr\u00fcche werden beibehalten.', 'Click a placeholder button to insert it. Line breaks are preserved.'),
    ],
    'src/app/(dashboard)/dashboard/billing/BillingClient.tsx': [
        ('>Bereit f\u00fcr mehr?\n', '>Ready for more?\n'),
    ],
    'src/app/(dashboard)/dashboard/analytics/AnalyticsClient.tsx': [
        ('>Vertr\u00e4ge</p>', '>Contracts</p>'),
    ],
    'src/app/client/[token]/contract/page.tsx': [
        ('Kein Vertrag verf\u00fcgbar.', 'No contract available.'),
    ],
    'src/app/client/[token]/gallery/page.tsx': [
        ('Dein Fotograf l\u00e4dt bald deine Bilder hoch.', 'Your photographer will upload your photos soon.'),
        ('Zur\u00fcck zum Portal', 'Back to portal'),
    ],
    'src/app/client/[token]/questionnaire/page.tsx': [
        ('Kein Fragebogen verf\u00fcgbar.', 'No questionnaire available.'),
    ],
    'src/app/client/[token]/questionnaire/QuestionnaireClientPage.tsx': [
        ('Deine Antworten wurden erfolgreich \u00fcbermittelt. {studioName} wird sich bei dir melden.', 'Your answers have been successfully submitted. {studioName} will get back to you.'),
        ('Bitte beantworte die folgenden Fragen, damit wir dein Shooting perfekt vorbereiten k\u00f6nnen.', 'Please answer the following questions so we can perfectly prepare for your shoot.'),
    ],
    'src/app/client/[token]/page.tsx': [
        ('// Projekt \u00dcberblick steps \u2014 auto-detection + manual override', '// Project overview steps \u2014 auto-detection + manual override'),
        ("label: 'Booking best\u00e4tigt'", "label: 'Booking confirmed'"),
        ("label: 'Fragebogen ausgef\u00fcllt'", "label: 'Questionnaire completed'"),
        ('// N\u00e4chste Schritte', '// Next steps'),
        ("cta: 'Inspirationen hinzuf\u00fcgen'", "cta: 'Add inspirations'"),
        ("toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })", "toLocaleDateString('en-US', { day: '2-digit', month: 'short' })"),
        ("label: 'Galerie verf\u00fcgbar'", "label: 'Gallery available'"),
        ("text: `Sch\u00f6n, dass du da bist! Hier findest du alles rund um dein Shooting. Bei Fragen bin ich immer f\u00fcr dich da.`", "text: `Welcome! Here you'll find everything about your shoot. Feel free to reach out if you have any questions.`"),
        ("title: 'Euer Shooting r\u00fcckt n\u00e4her!'", "title: 'Your shoot is coming up!'"),
        ("text: `Noch ${days === 0 ? 'heute' : `${days} ${days === 1 ? 'Tag' : 'Tage'}`} bis zu eurem gro\u00dfen Tag! Vergesst nicht, euer Moodboard zu erstellen und euch vorzubereiten.`", "text: `Only ${days === 0 ? 'today' : `${days} ${days === 1 ? 'day' : 'days'}`} until your big day! Don't forget to create your moodboard and get prepared.`"),
        ("text: 'Das Shooting war wundersch\u00f6n! Ich bin gerade dabei, eure Bilder zu bearbeiten. Ihr werdet benachrichtigt, sobald die Galerie fertig ist.'", "text: 'The shoot was wonderful! I am currently editing your photos. You will be notified once the gallery is ready.'"),
        ('{/* \u2500\u2500 PROJEKT \u00dcBERBLICK (Stepper) \u2500\u2500 */}', '{/* \u2500\u2500 PROJECT OVERVIEW (Stepper) \u2500\u2500 */}'),
        ('>Projekt \u00dcberblick\n', '>Project Overview\n'),
        ('{/* \u2500\u2500 N\u00c4CHSTE SCHRITTE \u2500\u2500 */}', '{/* \u2500\u2500 NEXT STEPS \u2500\u2500 */}'),
        ('>N\u00e4chste Schritte\n', '>Next Steps\n'),
        ('>In Maps \u00f6ffnen\n', '>Open in Maps\n'),
        ("? 'Ausgef\u00fcllt \u2713 \u2014 Antworten ansehen'", "? 'Completed \u2713 \u2014 View answers'"),
        (": 'Bitte ausf\u00fcllen \u2014 hilft bei der Vorbereitung'}", ": 'Please fill out \u2014 helps with preparation'}"),
        ("questionnaireSubmitted ? 'Antworten ansehen' : 'Jetzt ausf\u00fcllen'", "questionnaireSubmitted ? 'View answers' : 'Fill out now'"),
        ("timelineEvents.length === 1 ? 'Eintrag' : 'Eintr\u00e4ge'", "timelineEvents.length === 1 ? 'entry' : 'entries'"),
        ("photoCount === 1 ? 'Foto' : 'Fotos'", "photoCount === 1 ? 'photo' : 'photos'"),
        ("'Galerie verf\u00fcgbar'", "'Gallery available'"),
        ('Teile Inspirationen, Referenzbilder oder Links mit deinem Fotografen \u2014 zeige deinen Stil und deine W\u00fcnsche.', 'Share inspirations, reference images or links with your photographer \u2014 show your style and wishes.'),
        ('{/* \u2500\u2500 TIPPS F\u00dcR EUER SHOOTING \u2500\u2500 */}', '{/* \u2500\u2500 TIPS FOR YOUR SHOOT \u2500\u2500 */}'),
        ('>Tipps f\u00fcr euer Shooting\n', '>Tips for your shoot\n'),
        ("title: 'Was anziehen?', text: 'W\u00e4hlt Farben, die zueinander passen. Vermeidet gro\u00dfe Logos oder Muster.'", "title: 'What to wear?', text: 'Choose colors that complement each other. Avoid large logos or patterns.'"),
        ("title: 'Vorbereitung', text: 'Entspannt euch! Authentische Momente entstehen, wenn ihr euch wohlf\u00fchlt.'", "title: 'Preparation', text: 'Relax! Authentic moments happen when you feel comfortable.'"),
        ("title: 'Location Tipps', text: 'W\u00e4hlt einen Ort, der f\u00fcr euch bedeutungsvoll ist \u2014 das sieht man in den Fotos.'", "title: 'Location tips', text: 'Choose a place that is meaningful to you \u2014 it shows in the photos.'"),
    ],
    'src/app/client/[token]/timeline/page.tsx': [
        ('>Zur\u00fcck\n          </button>', '>Back\n          </button>'),
    ],
    'src/app/onboarding/page.tsx': [
        ("toast.error('Logo darf maximal 2MB gro\u00df sein')", "toast.error('Logo must be max 2MB')"),
        ('>Vollst\u00e4ndiger Name <span', '>Full Name <span'),
        ('Wie hei\u00dft dein Studio?', 'What is your studio name?'),
        ('>Zur\u00fcck\n                  </button>', '>Back\n                  </button>'),
        ('W\u00e4hle alle zutreffenden aus', 'Select all that apply'),
    ],
    'src/components/CookieBanner.tsx': [
        ('Wir verwenden technisch notwendige Cookies f\u00fcr die Authentifizierung.', 'We use technically necessary cookies for authentication.'),
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

print('\nDone batch 2!')
