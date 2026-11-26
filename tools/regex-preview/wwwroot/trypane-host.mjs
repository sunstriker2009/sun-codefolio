import { mountTryPane } from './trypane/trypane-regex-0.1.0-preview.1/src/pane.js';
import { RegexAdapter } from './trypane/trypane-regex-0.1.0-preview.1/src/adapters/regex.js';

const workerUrl = new URL('./trypane/trypane-regex-0.1.0-preview.1/runtime/wwwroot/regex-worker.mjs', import.meta.url);

export function createTryPanePreview({ pattern, input, mode, platform, busy, root, runButton, outcome }) {
  let unmount;
  let submittedText = '';
  function sync() {
    if (platform.value !== 'csharp') {
      unmount?.();
      unmount = undefined;
      root.hidden = true;
      runButton.hidden = false;
      outcome.hidden = false;
      return;
    }
    if (unmount) return;
    runButton.hidden = true;
    outcome.hidden = true;
    root.hidden = false;
    unmount = mountTryPane(root, {
      adapter: new RegexAdapter(workerUrl),
      readInput() {
        if (busy()) throw new Error('Finish editing or running saved cases first.');
        const expression = pattern();
        if (!expression) throw new Error('Enter a C# pattern first.');
        submittedText = input.value;
        return { pattern: expression, text: submittedText, mode: mode.value === 'match-all' ? 'all' : 'first' };
      },
      renderResult(result, target) {
        if (result.status !== 'match') return;
        const highlighted = document.createElement('pre');
        highlighted.setAttribute('aria-label', 'Highlighted input');
        highlighted.tabIndex = 0;
        let cursor = 0;
        for (const match of result.matches) {
          const end = match.index + match.text.length;
          if (match.index < cursor || end > submittedText.length || submittedText.slice(match.index, end) !== match.text) continue;
          highlighted.append(submittedText.slice(cursor, match.index));
          const mark = document.createElement('mark');
          mark.textContent = match.text || '∅';
          if (!match.text) mark.setAttribute('aria-label', 'Empty match at index ' + match.index);
          highlighted.append(mark);
          cursor = end;
        }
        highlighted.append(submittedText.slice(cursor));
        target.append(highlighted);

        const picker = document.createElement('select');
        picker.setAttribute('aria-label', 'Inspect match');
        result.matches.forEach(({ index }, item) => picker.add(new Option('Match ' + (item + 1) + ' · index ' + index, item)));
        if (result.matches.length > 1) target.append(picker);
        const details = document.createElement('pre');
        target.append(details);
        const describe = value => value === null ? 'unmatched' : JSON.stringify(value);
        function inspect() {
          const match = result.matches[Number(picker.value)];
          details.textContent = [
            'Matched ' + JSON.stringify(match.text) + ' at index ' + match.index,
            ...match.groups.map((value, index) => 'Group ' + (result.groupNumbers[index] ?? index + 1) + ' · ' + describe(value)),
            ...match.named.map(({ name, value }) => 'Name ' + name + ' · ' + describe(value)),
          ].join('\n');
        }
        picker.addEventListener('change', inspect);
        inspect();
      },
      describeResult(result) {
        if (result.status === 'invalid') return result.message;
        if (result.status === 'no-match') return 'No match.';
        if (result.status === 'timeout') return 'The match timed out. Try shorter text.';
        if (result.status === 'error') return 'The Regex runner could not complete the test.';
        const count = result.matches.length;
        return mode.value === 'match' ? 'Match.' : result.truncated
          ? 'Showing the first ' + count + ' matches.'
          : count + (count === 1 ? ' match.' : ' matches.');
      },
    });
  }
  sync.reset = () => unmount?.reset();
  return sync;
}
