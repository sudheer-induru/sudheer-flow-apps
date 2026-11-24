import { Command, CommandInput, CommandList } from '@cognite/aura/components/command';

import { SearchResults } from './SearchResults';
import { SearchSessionProvider } from './SearchSessionProvider';
import { useSearchViewModel } from './useSearchViewModel';

type SearchViewProps = {
  debounceMs?: number;
};

export function SearchView({ debounceMs }: SearchViewProps) {
  return (
    <SearchSessionProvider debounceMs={debounceMs}>
      <SearchPanel />
    </SearchSessionProvider>
  );
}

function SearchPanel() {
  const viewModel = useSearchViewModel();

  return (
    <section aria-labelledby="search-heading" className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold" id="search-heading">
          Asset 360
        </h1>
        <p className="text-muted-foreground">
          Find an asset by tag, name or description to see its live readings and work history in one place.
        </p>
      </header>
      <Command className="rounded-lg border shadow-sm" label="Search assets" shouldFilter={false}>
        <CommandInput
          aria-label="Search assets"
          autoFocus
          onValueChange={viewModel.setQuery}
          placeholder="Search by tag, name or description, for example 23-VA-9110-M01"
          value={viewModel.query}
        />
        <CommandList className="max-h-[28rem]">
          <SearchResults viewModel={viewModel} />
        </CommandList>
      </Command>
    </section>
  );
}
