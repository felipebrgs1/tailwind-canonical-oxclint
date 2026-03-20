// Teste de canonicalização de classes Tailwind CSS v4
// As classes não canônicas devem aparecer como warnings no VSCode com Tailwind IntelliSense

export function ButtonComponent() {
  return (
    // flex-grow -> grow, bg-gradient-to-r -> bg-linear-to-r
    <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex-grow bg-gradient-to-r">
      Click me
    </button>
  );
}

export function CardComponent() {
  return (
    // bg-gradient-to-br -> bg-linear-to-br, flex-shrink-0 -> shrink-0
    <div className="relative flex flex-col gap-4 p-6 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex-shrink-0">
      <h2 className="text-xl font-bold text-white">Card Title</h2>
      <p className="text-white/80">Card content</p>
    </div>
  );
}

export function ResponsiveLayout() {
  return (
    // flex-grow -> grow, sm:flex-shrink-0 -> sm:shrink-0
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 p-4 sm:p-6 md:p-8 flex-grow sm:flex-shrink-0">
      <div className="bg-white p-4 rounded-lg shadow">Item 1</div>
      <div className="bg-white p-4 rounded-lg shadow">Item 2</div>
    </div>
  );
}

export function NavbarComponent() {
  return (
    // bg-gradient-to-r (2x) -> bg-linear-to-r
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-gradient-to-r from-white to-gray-100 border-b border-gray-200 shadow-sm dark:bg-gradient-to-r dark:from-gray-900 dark:to-gray-800">
      <span className="font-bold">Logo</span>
      <div className="flex gap-4">
        <a href="#" className="text-gray-700 hover:text-gray-900">Link</a>
      </div>
    </nav>
  );
}

export function SidebarLayout() {
  return (
    // flex-shrink-0 -> shrink-0, flex-grow -> grow
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 p-4">
        Sidebar
      </aside>
      <main className="flex-grow overflow-y-auto p-6">
        Content
      </main>
    </div>
  );
}

export function MixedClasses() {
  return (
    // flex-grow -> grow, bg-gradient-to-l -> bg-linear-to-l, border-1 -> border
    <div className="flex flex-grow items-center justify-between p-4 m-2 bg-gradient-to-l border-1 rounded-lg shadow">
      Mixed classes
    </div>
  );
}

export function VariantPrefixes() {
  return (
    // hover:flex-grow -> hover:grow, dark:bg-gradient-to-r -> dark:bg-linear-to-r
    <div className="sm:md:lg:flex-grow dark:hover:bg-gradient-to-r group-hover:flex-shrink-0 data-[state=open]:bg-gradient-to-br">
      Variant prefixes
    </div>
  );
}

export function ArbitraryValues() {
  return (
    // grow-[2] -> grow-2, shrink-[3] -> shrink-3
    <div className="flex grow-[2] shrink-[3] p-[16px]">
      Arbitrary values
    </div>
  );
}

export function WithUtilityFunctions() {
  // cn(), clsx(), classNames(), twMerge(), cva() - string args são verificados
  const className = cn("flex-grow", "p-4", "bg-gradient-to-r", isActive && "rounded-lg");
  const clsxName = clsx("flex-shrink-0", "hover:bg-gradient-to-l", { "shadow-lg": isLarge });
  const twMergeName = twMerge("flex-grow-1", "bg-gradient-to-br", "from-blue-500");

  return (
    <div className={className}>
      Utility functions
    </div>
  );
}

export function StringLiterals() {
  // Strings literais fora de JSX também devem ser verificadas
  const buttonClass = "flex-grow bg-gradient-to-r p-4";
  const cardClass = "flex-shrink-0 bg-gradient-to-br from-purple-500";
  const layoutClass = `hover:flex-grow dark:bg-gradient-to-l`;

  return (
    <div className={buttonClass}>
      String literals
    </div>
  );
}

// Helpers fictícios para o exemplo
declare function cn(...args: any[]): string;
declare function clsx(...args: any[]): string;
declare function twMerge(...args: any[]): string;
declare const isActive: boolean;
declare const isLarge: boolean;
