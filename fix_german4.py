#!/usr/bin/env python3
"""Fix remaining German text - batch 4 (final)."""
import os

files = {
    'src/app/(dashboard)/dashboard/questionnaires/page.tsx': [
        ('Fragebgen', 'Questionnaires'),
    ],
    'src/app/(dashboard)/dashboard/invoices/InvoicesClient.tsx': [
        ('Bankverbindung \u2014 Bitte \u00fcberweisen Sie den Betrag auf folgendes Konto:', 'Bank details \u2014 Please transfer the amount to the following account:'),
        ('>Schlie\u00dfen\n              </button>', '>Close\n              </button>'),
        ('F\u00e4llig: {new Date(inv.due_date).toLocaleDateString(\'en-US\')}', 'Due: {new Date(inv.due_date).toLocaleDateString(\'en-US\')}'),
        ('>Als \u00fcberf\u00e4llig markieren\n', '>Mark as overdue\n'),
        ('>L\u00f6schen\n                          </button>', '>Delete\n                          </button>'),
        ('>F\u00e4lligkeitsdatum\n', '>Due date\n'),
        ("` \u00b7 F\u00e4llig ${new Date(createdInvoice.due_date).toLocaleDateString('en-US')}`", "` \u00b7 Due ${new Date(createdInvoice.due_date).toLocaleDateString('en-US')}`"),
        ('>Sp\u00e4ter\n', '>Later\n'),
    ],
    'src/app/(dashboard)/dashboard/contracts/ContractsClient.tsx': [
        ('>Vertr\u00e4ge\n            </h1>', '>Contracts\n            </h1>'),
        ('>Meine Vertr\u00e4ge\n', '>My Contracts\n'),
    ],
    'src/app/(dashboard)/dashboard/projects/new/page.tsx': [
        ('>Zur\u00fcck\n              </Link>', '>Back\n              </Link>'),
    ],
    'src/app/(dashboard)/dashboard/email-vorlagen/EmailVorlagenClient.tsx': [
        ('>Schlie\u00dfen\n', '>Close\n'),
    ],
    'src/app/(dashboard)/dashboard/billing/BillingClient.tsx': [
        ('>Bereit f\u00fcr mehr?\n', '>Ready for more?\n'),
    ],
    'src/app/client/[token]/page.tsx': [
        ('>Projekt \u00dcberblick\n', '>Project Overview\n'),
        ('>N\u00e4chste Schritte\n', '>Next Steps\n'),
        ('>In Maps \u00f6ffnen\n', '>Open in Maps\n'),
        ('>Tipps f\u00fcr euer Shooting\n', '>Tips for your shoot\n'),
    ],
    'src/app/client/[token]/timeline/page.tsx': [
        ('>Zur\u00fcck\n          </button>', '>Back\n          </button>'),
    ],
    'src/app/onboarding/page.tsx': [
        ('>Vollst\u00e4ndiger Name <span className="text-[#E84C1A]">*</span>', '>Full Name <span className="text-[#E84C1A]">*</span>'),
        ('>Zur\u00fcck\n                    </button>', '>Back\n                    </button>'),
        ("toast.error(data.error || 'Ung\u00fcltiger Code')", "toast.error(data.error || 'Invalid code')"),
        ("toast.error('Fehler beim Einl\u00f6sen')", "toast.error('Error redeeming code')"),
        ("inviteLoading ? '...' : 'Einl\u00f6sen'", "inviteLoading ? '...' : 'Redeem'"),
        ('>Einrichtung abschlie\u00dfen\n', '>Complete setup\n'),
        ('\u00dcberspringen und sp\u00e4ter einrichten', 'Skip and set up later'),
    ],
    'src/components/dashboard/DeliveryChecklist.tsx': [
        ("hint: 'Go to Clients \u2192 E-Mail hinzuf\u00fcgen'", "hint: 'Go to Clients \u2192 Add email'"),
        ('Portal bereit zum Versand \u2014 alles vollst\u00e4n', 'Portal ready to send \u2014 everything complete'),
    ],
    'src/components/dashboard/EmailVorlagePicker.tsx': [
        ('>E-Mail Vorlage w\u00e4hlen\n', '>Select email template\n'),
        ('>Zur\u00fcck\n', '>Back\n'),
    ],
    'src/components/dashboard/ContractEditor.tsx': [
        ('>Kundenfeld einf\u00fcgen\n', '>Insert client field\n'),
        ('title="R\u00fckg\u00e4ngig"', 'title="Undo"'),
    ],
    'src/components/dashboard/PortalSettingsTab.tsx': [
        ("text: 'Your photos are being edited! I am giving my best M\u00fche, damit alles perfekt wird. Du erh\u00e4ltst eine Nachricht, sobald die Galerie fertig ist.'", "text: 'Your photos are being edited! I am giving my best effort so everything turns out perfect. You will be notified once the gallery is ready.'"),
        ('Diese Nachricht erscheint im Portal als pers\u00f6nliche Nachricht von dir. Leer lassen f\u00fcr automatische Nachricht.', 'This message appears in the portal as a personal message from you. Leave empty for automatic message.'),
        ('placeholder="z.B. Deine Galerie ist in Bearbeitung! Lieferung ca. 20. M\u00e4rz \U0001f4f8"', 'placeholder="e.g. Your gallery is being edited! Delivery approx. March 20 \U0001f4f8"'),
        ('\u00d7 Nachricht l\u00f6schen (automatisch)', '\u00d7 Delete message (automatic)'),
        ('>Links f\u00fcr den Kunden\n', '>Links for the client\n'),
        ('>Link hinzuf\u00fcgen\n', '>Add link\n'),
        ('F\u00fcge n\u00fctzliche Links hinzu, die dein Kunde im Portal sehen soll \u2014 z.B. Pinterest-Board, WeTransfer, Dropbox, deine Website, etc.', 'Add useful links that your client should see in the portal \u2014 e.g. Pinterest board, WeTransfer, Dropbox, your website, etc.'),
        ('>Noch keine Links \u2014 klicke um einen hinzuzuf\u00fcgen</p>', '>No links yet \u2014 click to add one</p>'),
        ("label: 'Shoot today'", "label: 'Shoot today'"),
        ("text: 'Today is your big day! I am excited and looking forward", "text: 'Today is your big day! I am excited and looking forward"),
    ],
    'src/components/dashboard/QuestionnaireTab.tsx': [
        ("toast.success(`Fragebogen geplant f\u00fcr ${dt.toLocaleDateString('de-DE')} um ${scheduleTime} Uhr`)", "toast.success(`Questionnaire scheduled for ${dt.toLocaleDateString('en-US')} at ${scheduleTime}`)"),
        ("if (!confirm('Fragebogen wirklich l\u00f6schen?')) return", "if (!confirm('Really delete this questionnaire?')) return"),
        ("toast.success('Fragebogen gel\u00f6scht')", "toast.success('Questionnaire deleted')"),
        ('>Erstelle Fragen f\u00fcr deinen Kunden</p>', '>Create questions for your client</p>'),
        ('>Frage hinzuf\u00fcgen\n', '>Add question\n'),
        ('>Noch keine Fragen \u2014 lade eine Vorlage oder f\u00fcge Fragen hinzu</p>', '>No questions yet \u2014 load a template or add questions</p>'),
        ('title="L\u00f6schen"', 'title="Delete"'),
        ("Ausgef\u00fcllt am {new Date(submission.submitted_at).toLocaleDateString('de-DE')}", "Completed on {new Date(submission.submitted_at).toLocaleDateString('en-US')}"),
        ('label="Vorlage w\u00e4hlen"', 'label="Select template"'),
        ('Der Button zum Fragebogen wird automatisch im Email hinzugef\u00fcgt.', 'The questionnaire button will be automatically added to the email.'),
        ('>Vorlage ausw\u00e4hlen</h3>', '>Select template</h3>'),
        ('W\u00e4hle eine Vorlage und passe sie an', 'Choose a template and customize it'),
        ("label: 'Hochzeit \u2014 Fragebogen'", "label: 'Wedding \u2014 Questionnaire'"),
        ("desc: 'Trauung, Feier, G\u00e4ste & besondere W\u00fcnsche'", "desc: 'Ceremony, reception, guests & special wishes'"),
        ("label: 'Portrait Shooting \u2014 Fragebogen'", "label: 'Portrait Shoot \u2014 Questionnaire'"),
        ("desc: 'Stil, Look, Referenzen & W\u00fcnsche'", "desc: 'Style, look, references & wishes'"),
    ],
    'src/components/dashboard/TimelineBuilder.tsx': [
        ('>Ereignis hinzuf\u00fcgen\n', '>Add event\n'),
        ('>Erstes Ereignis hinzuf\u00fcgen\n', '>Add first event\n'),
    ],
    'src/components/dashboard/ProjectTabs.tsx': [
        ('Nur f\u00fcr dich sichtbar \u2014 erscheint nicht auf der Rechnung', 'Only visible to you \u2014 does not appear on the invoice'),
        ('Erstelle die erste Rechnung f\u00fcr dieses Projekt', 'Create the first invoice for this project'),
        ("F\u00e4llig: {new Date(inv.due_date).toLocaleDateString('de-DE')}", "Due: {new Date(inv.due_date).toLocaleDateString('en-US')}"),
    ],
    'src/components/dashboard/ContractTab.tsx': [
        ('>Vollst\u00e4ndiger Name *\n', '>Full Name *\n'),
        ('>L\u00f6schen\n', '>Delete\n'),
        ("if (!confirm('Vertrag als unterschrieben markieren? Dies kann nicht r\u00fckg\u00e4ngig gemacht werden.')) return", "if (!confirm('Mark contract as signed? This cannot be undone.')) return"),
        ("toast.success('Vertrag gel\u00f6scht')", "toast.success('Contract deleted')"),
        ('label="Vorlage w\u00e4hlen"', 'label="Select template"'),
        ('Der Unterschriften-Link wird automatisch im E-Mail hinzugef\u00fcgt.', 'The signature link will be automatically added to the email.'),
        ('\u2190 Zur\u00fcck', '\u2190 Back'),
        ("setSendMessage(`Hallo ${clientName?.split(' ')[0] || ''},\\n\\nbitte unterzeichne den beigef\u00fcgten Vertrag \u00fcber den folgenden Link.\\n\\nVielen Dank!\\n${photographerName || ''}`)", "setSendMessage(`Hello ${clientName?.split(' ')[0] || ''},\\n\\nplease sign the attached contract via the following link.\\n\\nThank you!\\n${photographerName || ''}`)"),
        ('>Vertr\u00e4ge\n          </h2>', '>Contracts\n          </h2>'),
    ],
    'src/components/dashboard/GalleryTab.tsx': [
        ('>Noch keine Galerie f\u00fcr dieses Projekt</p>', '>No gallery for this project yet</p>'),
        ('>W\u00e4hle ein Design-Template</p>', '>Choose a design template</p>'),
        ('W\u00e4hle ein Layout f\u00fcr die Kunden-Galerie', 'Choose a layout for the client gallery'),
        ('{selected.size} ausgew\u00e4hlt', '{selected.size} selected'),
        ('>Alle ausw\u00e4hlen</button>', '>Select all</button>'),
        ('>L\u00f6schen\n', '>Delete\n'),
    ],
    'src/components/dashboard/BookingDetailsTab.tsx': [
        ('>Treffpunkt (pr\u00e4zise)\n', '>Meeting point (precise)\n'),
        ('>Maps \u00f6ffnen\n', '>Open in Maps\n'),
    ],
    'src/components/dashboard/UpgradeModal.tsx': [
        ('>J\u00e4hrlich\n', '>Annual\n'),
        ('Hast du einen Einladungscode erhalten? L\u00f6se ihn hier ein und erhalte kostenlosen Zugang.', 'Have you received an invite code? Redeem it here and get free access.'),
        ("inviteLoading ? '...' : <><span>Einl\u00f6sen</span>", "inviteLoading ? '...' : <><span>Redeem</span>"),
        ('>Demn\u00e4chst verf\u00fcgbar\n', '>Coming soon\n'),
        ('Jederzeit k\u00fcndbar \u00b7 Sichere Zahlung via Stripe', 'Cancel anytime \u00b7 Secure payment via Stripe'),
    ],
    'src/components/marketing/FAQAccordion.tsx': [
        ("a: 'Yes. Fotonizer uses a simple electronic signature (SES) in accordance with the eIDAS regulation. For photographyertr\u00e4ge ist diese Signaturform rechtlich anerkannt. Wir speichern Zeitstempel, IP-Adresse und das signierte PDF als Nachweis.'", "a: 'Yes. Fotonizer uses a simple electronic signature (SES) in accordance with the eIDAS regulation. For photography contracts this signature form is legally recognized. We store timestamp, IP address and the signed PDF as proof.'"),
        ("a: 'You will see a friendly upgrade modal \u2014 no error message. You can continue to manage existing clientsalten und erh\u00e4ltst eine direkte M\u00f6glichkeit, auf einen h\u00f6heren Plan zu wechseln.'", "a: 'You will see a friendly upgrade modal \u2014 no error message. You can continue to manage existing clients and get a direct option to upgrade to a higher plan.'"),
        ("a: 'No. Each client receives a unique, randomly generated link (32 characters). Without this link it is kein Zugriff m\u00f6glich. Portale sind vollst\u00e4ndig voneinander isoliert.'", "a: 'No. Each client receives a unique, randomly generated link (32 characters). Without this link, no access is possible. Portals are completely isolated from each other.'"),
        ("a: 'Photos are stored in Supabase Storage (EU region) as long as your account is active. You canen jederzeit deaktivieren oder l\u00f6schen. Bei K\u00fcndigung hast du 30 Tage Zeit, deine Daten zu exportieren.'", "a: 'Photos are stored in Supabase Storage (EU region) as long as your account is active. You can deactivate or delete them at any time. Upon cancellation you have 30 days to export your data.'"),
        ("a: 'Custom Domains sind im Studio-Plan (\u20ac39/mo) verf\u00fcgbar. Damit k\u00f6nnen Kundenportale unter deiner eigenen Domain erscheinen, z.B. portal.deinstudio.de.'", "a: 'Custom domains are available in the Studio plan (\u20ac39/mo). This allows client portals to appear under your own domain, e.g. portal.yourstudio.com.'"),
        ("q: 'Wie k\u00fcndige ich?'", "q: 'How do I cancel?'"),
        ("a: 'Jederzeit mit einem Klick im Billing-Bereich deines Dashboards. Keine K\u00fcndigungsfristen, keine versteckten Geb\u00fchren. Dein Account wechselt automatisch zum Free-Plan.'", "a: 'Anytime with one click in the billing section of your dashboard. No notice periods, no hidden fees. Your account automatically switches to the Free plan.'"),
    ],
    'src/components/marketing/PricingSection.tsx': [
        ("'Priorit\u00e4ts-Support'", "'Priority support'"),
        ("cta: 'Pro w\u00e4hlen'", "cta: 'Choose Pro'"),
        ("description: 'F\u00fcr Teams & Agenturen'", "description: 'For teams & agencies'"),
        ("cta: 'Studio w\u00e4hlen'", "cta: 'Choose Studio'"),
        ('\U0001f389 <span style={{ color: \'#F59E0B\' }}>Launch-Angebot:</span> Die ersten <strong>2 Monate 50% g\u00fcnstiger</strong> auf alle bezahlten Pl\u00e4ne \u2014 automatisch!', '\U0001f389 <span style={{ color: \'#F59E0B\' }}>Launch offer:</span> First <strong>2 months 50% off</strong> on all paid plans \u2014 automatically!'),
        ('>J\u00e4hrlich\n', '>Annual\n'),
        ("oder \u20ac{Math.round(plan.annual / 12)}/Monat j\u00e4hrlich", "or \u20ac{Math.round(plan.annual / 12)}/month billed annually"),
        ('>Demn\u00e4chst verf\u00fcgbar\n', '>Coming soon\n'),
    ],
    'src/components/client-portal/GalleryViewer.tsx': [
        ('Filter zur\u00fccksetzen</button>', 'Reset filter</button>'),
    ],
    'src/components/client-portal/MoodBoard.tsx': [
        ('>Hinzuf\u00fcgen\n', '>Add\n'),
    ],
    'src/components/client-portal/ContractSigningClient.tsx': [
        ('>Zur\u00fcck zum Portal\n', '>Back to portal\n'),
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

print('\nDone batch 4!')
