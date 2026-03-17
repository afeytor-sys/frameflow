#!/usr/bin/env python3
"""Fix all remaining German text in the Fotonizer project."""
import os, re

files = {
    'src/app/(dashboard)/dashboard/analytics/AnalyticsClient.tsx': [
        ("label: 'Konversion'", "label: 'Conversion'"),
        ("von ${contracts.length} Vertr\u00e4gen", "of ${contracts.length} contracts"),
        ("Keine Vertr\u00e4ge", "No contracts"),
        ("\u00dcberblick \u00fcber dein Studio-Wachstum", "Overview of your studio growth"),
        ("\u00dcbersicht aller Vertr\u00e4ge", "Overview of all contracts"),
        ("Noch keine Vertr\u00e4ge", "No contracts yet"),
        ("label: 'Vertr\u00e4ge'", "label: 'Contracts'"),
        ("label: '\u00dcberf\u00e4llig'", "label: 'Overdue'"),
    ],
    'src/app/(dashboard)/dashboard/billing/BillingClient.tsx': [
        ("label: 'Vertr\u00e4ge pro Kunde'", "label: 'Contracts per client'"),
        ("label: 'Priorit\u00e4ts-Support'", "label: 'Priority support'"),
        ("toast.error('Fehler beim \u00d6ffnen des Kundenportals')", "toast.error('Error opening client portal')"),
        ("Verwalte deine Zahlungsmethode, lade Rechnungen herunter und k\u00fcndige dein Abo im Stripe-Kundenportal.", "Manage your payment method, download invoices and cancel your subscription in the Stripe customer portal."),
        ("portalLoading ? 'Weiterleitung...' : 'Stripe-Kundenportal \u00f6ffnen'", "portalLoading ? 'Redirecting...' : 'Open Stripe customer portal'"),
    ],
    'src/app/(dashboard)/dashboard/bookings/page.tsx': [
        ("const MONTHS_DE = ['Januar','Februar','M\u00e4rz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']", "const MONTHS_DE = ['January','February','March','April','May','June','July','August','September','October','November','December']"),
        ("toast.error('Bitte ein Datum ausw\u00e4hlen')", "toast.error('Please select a date')"),
        ('placeholder="z.B. Schloss Nymphenburg, M\u00fcnchen"', 'placeholder="e.g. Central Park, New York"'),
        ('placeholder="Besondere W\u00fcnsche, Infos..."', 'placeholder="Special requests, notes..."'),
    ],
    'src/app/(dashboard)/dashboard/contracts/ContractsClient.tsx': [
        ("toast.error('Bitte ein Projekt ausw\u00e4hlen')", "toast.error('Please select a project')"),
        ("if (!confirm('Vorlage wirklich l\u00f6schen?')) return", "if (!confirm('Really delete this template?')) return"),
        ("toast.success('Vorlage gel\u00f6scht')", "toast.success('Template deleted')"),
        ("toast.error('Vorlagen-Funktion noch nicht verf\u00fcgbar. Bitte Migration ausf\u00fchren.')", "toast.error('Template feature not yet available. Please run migration.')"),
        ("a.download = `${contract.title.replace(/[^a-zA-Z0-9\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df\\s]/g, '').trim()}.pdf`", "a.download = `${contract.title.replace(/[^a-zA-Z0-9\\s]/g, '').trim()}.pdf`"),
        (">Vertr\u00e4ge\n            </h1>", ">Contracts\n            </h1>"),
        (">Vertr\u00e4ge<", ">Contracts<"),
    ],
    'src/app/(dashboard)/dashboard/email-vorlagen/EmailVorlagenClient.tsx': [
        ("toast.error('Tabelle noch nicht vorhanden. Bitte Migration ausf\u00fchren.')", "toast.error('Table not yet available. Please run migration.')"),
        ("if (!confirm('Vorlage wirklich l\u00f6schen?')) return", "if (!confirm('Really delete this template?')) return"),
        ("toast.success('Vorlage gel\u00f6scht')", "toast.success('Template deleted')"),
        ("} Vorlagen \u00b7 Erstelle und verwalte E-Mail-Vorlagen f\u00fcr Kunden", "} templates \u00b7 Create and manage email templates for clients"),
        ('title="L\u00f6schen"', 'title="Delete"'),
        ("Verf\u00fcgbare Platzhalter", "Available placeholders"),
    ],
    'src/app/(dashboard)/dashboard/galleries/page.tsx': [
        ("toast.error('Bitte ein Projekt ausw\u00e4hlen')", "toast.error('Please select a project')"),
        ('<option value="">Projekt ausw\u00e4hlen...</option>', '<option value="">Select project...</option>'),
    ],
    'src/app/(dashboard)/dashboard/invoices/InvoicesClient.tsx': [
        ("label: '\u00dcberf\u00e4llig'", "label: 'Overdue'"),
        ('<div class="section-label">Rechnungsempf\u00e4nger</div>', '<div class="section-label">Bill to</div>'),
        ("toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })", "toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })"),
        ("F\u00e4llig am: ", "Due on: "),
        ('<div class="section-label">Bankverbindung \u2014 Bitte \u00fcberweisen Sie den Betrag auf folgendes Konto:</div>', '<div class="section-label">Bank details \u2014 Please transfer the amount to the following account:</div>'),
        ("<div class=\"footer\">Vielen Dank f\u00fcr Ihr Vertrauen! \u00b7 ${photographer?.studio_name || photographer?.full_name || 'Fotonizer'}</div>", "<div class=\"footer\">Thank you for your trust! \u00b7 ${photographer?.studio_name || photographer?.full_name || 'Fotonizer'}</div>"),
        ('className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#6B6B6B] mb-2">Rechnungsempf\u00e4nger</p>', 'className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#6B6B6B] mb-2">Bill to</p>'),
    ],
    'src/app/(dashboard)/dashboard/projects/new/page.tsx': [
        ("Upgrade auf Starter oder Pro f\u00fcr mehr Projekte.", "Upgrade to Starter or Pro for more projects."),
        (">Zur\u00fcck\n              </Link>", ">Back\n              </Link>"),
        ('<option value="">Kunden ausw\u00e4hlen...</option>', '<option value="">Select client...</option>'),
        ('placeholder="Anna M\u00fcller"', 'placeholder="Jane Smith"'),
        ("creatingClient ? 'Wird erstellt...' : 'Kunden erstellen & ausw\u00e4hlen'", "creatingClient ? 'Creating...' : 'Create client & select'"),
        ('<option value="">Ausw\u00e4hlen...</option>', '<option value="">Select...</option>'),
    ],
    'src/app/(dashboard)/dashboard/projects/page.tsx': [
        ('if (!confirm(`Projekt "${title}" wirklich l\u00f6schen? Alle zugeh\u00f6rigen Daten werden gel\u00f6scht.`)) return', 'if (!confirm(`Really delete project "${title}"? All related data will be deleted.`)) return'),
        ("toast.error('Fehler beim L\u00f6schen')", "toast.error('Error deleting')"),
        ("toast.success('Projekt gel\u00f6scht')", "toast.success('Project deleted')"),
        ("projects.length === 1 ? 'Projekt' : 'Projekte'", "projects.length === 1 ? 'Project' : 'Projects'"),
        ("Verwalte deine Shootings und Auftr\u00e4ge", "Manage your shoots and jobs"),
        ("sortBy === 'date' ? 'N\u00e4chste Termine' : sortBy === 'alpha' ? 'A \u2192 Z' : sortBy === 'type' ? 'Shooting-Typ' : filterType ? filterType : 'Sortieren'", "sortBy === 'date' ? 'Upcoming' : sortBy === 'alpha' ? 'A \u2192 Z' : sortBy === 'type' ? 'Shoot type' : filterType ? filterType : 'Sort'"),
        ("{ key: 'date',   label: '\U0001f5d3  N\u00e4chste Termine' }", "{ key: 'date',   label: '\U0001f5d3  Upcoming' }"),
    ],
    'src/app/(dashboard)/dashboard/questionnaires/page.tsx': [
        (">Frageb\u00f6gen\n          </h1>", ">Questionnaires\n          </h1>"),
        ("`Ausgef\u00fcllt ${new Date", "`Completed ${new Date"),
        ("filter === 'all' ? 'Noch keine Frageb\u00f6gen' : `Keine \"${STATUS_CONFIG[filter as keyof typeof STATUS_CONFIG]?.label}\"-Frageb\u00f6gen`", "filter === 'all' ? 'No questionnaires yet' : `No \"${STATUS_CONFIG[filter as keyof typeof STATUS_CONFIG]?.label}\" questionnaires`"),
        ("W\u00e4hle eine Vorlage oben aus oder erstelle Frageb\u00f6gen direkt in einem Projekt", "Select a template above or create questionnaires directly in a project"),
        (">Frage hinzuf\u00fcgen\n", ">Add question\n"),
        ("Noch keine Fragen \u2014 f\u00fcge Fragen hinzu", "No questions yet \u2014 add questions"),
    ],
}

for filepath, replacements in files.items():
    if not os.path.exists(filepath):
        print(f'SKIP (not found): {filepath}')
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

print('\nDone batch 1!')
