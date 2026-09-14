import { MICHIGAN_STATE_GEO_ID, type CountyFeature, type GeographyId } from "../types";

export function CountySearch({
  counties,
  disabled,
  onSelect,
}: {
  counties: CountyFeature[];
  disabled?: boolean;
  onSelect: (geoId: GeographyId) => void;
}) {
  return (
    <label className="county-search">
      <span className="county-search__label">County</span>
      <input
        type="search"
        list="county-search-names"
        placeholder="Search county…"
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => {
          const q = event.target.value.trim();
          if (!q) return;
          if (/^michigan$/i.test(q) || q === MICHIGAN_STATE_GEO_ID) {
            onSelect(MICHIGAN_STATE_GEO_ID);
            return;
          }
          const match = counties.find(
            (county) =>
              county.name.toLowerCase() === q.toLowerCase() || county.fips === q,
          );
          if (match) onSelect(match.fips);
        }}
      />
      <datalist id="county-search-names">
        <option value="Michigan" />
        {counties.map((county) => (
          <option key={county.fips} value={county.name} />
        ))}
      </datalist>
    </label>
  );
}
