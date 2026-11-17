"""Derive the entire permitted tool leaf from its original bytes and authored patch."""
import re


def patched_bytes(original, patch, leaf):
    lines = patch.splitlines(keepends=True)
    if [line.rstrip('\n') for line in lines if line.startswith('--- ')] != ['--- a/' + leaf]:
        raise ValueError('Unexpected tool patch source')
    if [line.rstrip('\n') for line in lines if line.startswith('+++ ')] != ['+++ b/' + leaf]:
        raise ValueError('Unexpected tool patch target')
    source = original.decode().splitlines(keepends=True)
    output, cursor, index, hunks = [], 0, 0, 0
    while index < len(lines):
        match = re.match(r'^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@', lines[index])
        if not match:
            index += 1
            continue
        hunks += 1
        start = int(match[1]) - 1
        if start < cursor or start > len(source):
            raise ValueError('Invalid tool patch hunk')
        output.extend(source[cursor:start]); cursor = start; index += 1
        removed = added = 0
        while index < len(lines) and not lines[index].startswith('@@ '):
            line = lines[index]
            if not line or line[0] not in ' +-':
                raise ValueError('Unexpected tool patch line')
            if line[0] in ' -':
                if cursor >= len(source) or source[cursor] != line[1:]:
                    raise ValueError('Tool patch does not match original bytes')
                cursor += 1; removed += 1
            if line[0] in ' +':
                output.append(line[1:]); added += 1
            index += 1
        if removed != int(match[2] or 1) or added != int(match[4] or 1):
            raise ValueError('Tool patch hunk lengths differ')
    if not hunks:
        raise ValueError('Missing tool patch hunk')
    output.extend(source[cursor:])
    return ''.join(output).encode()
