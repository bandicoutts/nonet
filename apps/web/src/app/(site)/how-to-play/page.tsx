import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to play',
  description: 'Fill every row, column and box with 1 to 9.',
  alternates: { canonical: '/how-to-play' },
};

/**
 * How to play.
 *
 * Static: nothing here depends on the player, so it is a server component with
 * no client bundle at all. Copy verbatim from `design/export/copy.md`.
 *
 * The keyboard table is the only part saying something the rest of the product
 * cannot — every other rule here is discoverable by playing, and a shortcut is
 * discoverable by nobody.
 */
export default function Page() {
  return (
    <section className="mx-auto flex w-full max-w-[52rem] flex-col gap-l px-m py-l drawer:px-2xl rail:px-4xl">
      <header className="flex flex-col gap-s">
        <p className="type-kicker text-fg3-text">How to play</p>
        <h1 className="type-display text-fg">Fill every row, column and box with 1 to 9.</h1>
        <p className="type-body text-fg2 max-w-[56ch]">
          No digit repeats in a row, a column, or a heavy-ruled 3&times;3 box. Every Nonet puzzle
          has exactly one solution and can be solved by reasoning alone &mdash; you never need to
          guess.
        </p>
        <Link
          href="/board"
          className="type-button mt-s inline-flex min-h-(--tap-target-min) w-fit items-center border-0 bg-fg px-l text-bg no-underline transition-colors duration-(--motion-hover) ease-(--ease-hover) hover:bg-accent hover:text-accent-ink focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset-prominent)"
        >
          Start today&rsquo;s puzzle
        </Link>
      </header>

      <Section title="Reading the grid">
        <List
          items={[
            'A given. Bold, black, fixed.',
            'Yours. Lighter weight, in blue.',
            'A pencil mark. Small and grey.',
            'Wrong, when checking is on.',
          ]}
        />
      </Section>

      <Section title="Playing">
        <List
          items={[
            'Two ways in. Cell → digit: pick a cell, then its digit. Digit → cells: pick a digit once, then tap every cell that takes it. Switch on the board or in Settings.',
            'Hold a pad key to write that digit as a pencil mark. The Notes toggle stays for a run of them; placing a digit clears it from the notes it rules out.',
            'A digit with all nine placed is spent — its key is struck through and stops responding.',
            'With a digit loaded, repeated wrong taps of that same digit cost one mistake, not three. The key turns red until you change digit or clear the error.',
            'Three mistakes lock the puzzle. Three hints per puzzle, each marking the solve assisted.',
          ]}
        />
      </Section>

      <Section title="Keyboard">
        {/*
         * A real table, because it is one: every row pairs a key with what it
         * does, and a screen reader should say so rather than read two
         * unrelated columns of text.
         */}
        <table className="w-full border-collapse">
          <tbody>
            {(
              [
                ['1–9', 'Place in the selected cell'],
                ['⇧1–9', 'Note, staying in placement'],
                ['Space', 'Notes mode'],
                ['Del', 'Erase'],
                ['⌘Z / ⌘⇧Z', 'Undo, redo'],
                ['H', 'Hint'],
                ['P', 'Pause'],
              ] as const
            ).map(([key, meaning]) => (
              <tr key={key}>
                <th
                  scope="row"
                  className="type-mono-data border-b border-line2 py-s pr-l text-left align-top font-normal whitespace-nowrap text-fg"
                >
                  {key}
                </th>
                <td className="type-body-small border-b border-line2 py-s text-fg2">{meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="The daily">
        <List
          items={[
            'One puzzle a day, the same for everyone, published at 00:05 UTC.',
            'Difficulty follows the week: easy on Monday, expert on Saturday.',
            'Solve it on the day to extend your run. Practice and archive puzzles do not count.',
          ]}
        />
      </Section>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-s border-t border-rule pt-m">
      <h2 className="type-mono-label text-fg3-text">{title}</h2>
      {children}
    </div>
  );
}

function List({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li
          key={item}
          className="type-body-small border-b border-line2 py-s text-fg2 last:border-b-0"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
