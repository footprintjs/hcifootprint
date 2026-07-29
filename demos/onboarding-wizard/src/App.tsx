import { useState, type ReactElement } from 'react';

import type { ProviderKind } from './agent/providers.js';
import { Chat } from './ui/Chat.js';
import { Keys } from './ui/Keys.js';
import {
  ActionSurfacePanel,
  BacklogPanel,
  JourneysPanel,
  ReceiptsPanel,
  SourcesPanel,
  UrlProbePanel,
  WarningsPanel,
} from './ui/Panels.js';
import { useApp, useHashRouting } from './ui/useApp.js';
import { Wizard } from './ui/Wizard.js';

export function App(): ReactElement {
  const { app } = useApp();
  useHashRouting(app);
  const [provider, setProvider] = useState<ProviderKind>('mock');

  return (
    <main>
      <header className="masthead">
        <h1>Onboarding wizard</h1>
        <p>
          A five-page signup whose graph grew from the route table and journey list the app already
          owned — and whose navigation has no handlers at all.
        </p>
        <Keys provider={provider} onProvider={setProvider} />
      </header>

      <div className="columns">
        <div className="column app-column">
          <Wizard app={app} />
          <Chat app={app} provider={provider} />
        </div>

        <div className="column panel-column">
          <p className="law">
            No panel below states a fact the session did not return. Each one names the call it was
            rendered from.
          </p>
          <SourcesPanel app={app} />
          <ActionSurfacePanel app={app} />
          <JourneysPanel app={app} />
          <ReceiptsPanel app={app} />
          <BacklogPanel app={app} />
          <UrlProbePanel app={app} />
          <WarningsPanel app={app} />
        </div>
      </div>
    </main>
  );
}
