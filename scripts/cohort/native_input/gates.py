"""A passing native verdict requires the complete, ordered original gate census."""
REQUIRED = (
    'root-lock', 'docs-lock', 'root-install', 'native-pins', 'ordinary-pins-refused',
    'cohort-faults', 'native-fixtures', 'typecheck', 'build', 'library-test', 'whole-badge',
    'coverage', 'agent-guide', 'docs-toolchain', 'live-desk', 'onboarding-wizard-demo',
    'publint', 'attw', 'pack', 'prepare-consumer', 'consumer-install',
    'consumer-identity', 'consumer-types', 'consumer-runtime', 'docs-install',
    'docs-truth', 'docs-api', 'docs-build', 'docs-links')


def require_gates(records):
    if [row.get('label') for row in records] != list(REQUIRED):
        raise ValueError('Incomplete, reordered or repeated HCI native gate census')
    for row in records:
        expected = 1 if row['label'] == 'ordinary-pins-refused' else 0
        if type(row.get('exit')) is not int or type(row.get('expectedExit')) is not int:
            raise ValueError('Unknown HCI native command outcome')
        if row['exit'] != expected or row['expectedExit'] != expected or row.get('afterGuardError') is not None:
            raise ValueError('Unsuccessful HCI native gate: ' + row['label'])
