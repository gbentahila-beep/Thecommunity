/**
 * Piège à robots (étape D) : un champ invisible et hors tabulation. Un humain ne le remplit jamais ;
 * un robot qui remplit tous les champs le remplit, et le serveur ignore alors l'envoi sans le dire.
 */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -start-[10000px] top-auto h-px w-px overflow-hidden opacity-0">
      <label>
        Site web
        <input name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
