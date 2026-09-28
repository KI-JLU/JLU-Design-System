/**
 * @ki4jlu/design-system — public API.
 *
 * Import components from here; import the tokens once in your app CSS:
 *   @import "tailwindcss";
 *   @import "@ki4jlu/design-system/tokens.css";
 *   @source "../node_modules/@ki4jlu/design-system";
 * (see README for full consumer setup, fonts, and the no-flash theme script)
 */
export {
  AppShell,
  type AppShellProps,
  type AppShellPanel,
  type AppShellPanelResize,
} from "./components/app-shell";
export { Avatar, type AvatarProps } from "./components/avatar";
export { Badge, type BadgeProps } from "./components/badge";
export { badgeVariants } from "./components/badge-variants";
export {
  BottomTabBar,
  type BottomTabBarItem,
  type BottomTabBarProps,
} from "./components/bottom-tab-bar";
export {
  bottomTabBarVariants,
  bottomTabBarTabVariants,
  bottomTabBarIconVariants,
} from "./components/bottom-tab-bar-variants";
export { Button, type ButtonProps } from "./components/button";
export { buttonVariants } from "./components/button-variants";
export {
  Card,
  type CardProps,
  CardHeader,
  CardTitle,
  type CardTitleProps,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/card";
export { ChatBubble, type ChatBubbleProps } from "./components/chat-bubble";
export { chatBubbleVariants } from "./components/chat-bubble-variants";
export { Checkbox } from "./components/checkbox";
export { CodeBlock, type CodeBlockProps } from "./components/code-block";
export { Container, type ContainerProps } from "./components/container";
export { containerVariants } from "./components/container-variants";
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  type DialogContentProps,
} from "./components/dialog";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  type DropdownMenuItemProps,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./components/dropdown-menu";
export { fieldVariants } from "./components/field-variants";
export { FilterChips, type FilterChipsProps, type FilterChipsOption } from "./components/filter-chips";
export { filterChipVariants } from "./components/filter-chips-variants";
export { FilterMenu, type FilterMenuProps, type FilterMenuOption } from "./components/filter-menu";
export { Grid, type GridProps } from "./components/grid";
export { gridVariants } from "./components/grid-variants";
export {
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "./components/form";
export { Input, type InputProps } from "./components/input";
export { Label } from "./components/label";
export { ListToolbar, type ListToolbarProps } from "./components/list-toolbar";
export { Logo, type LogoProps } from "./components/logo";
export { logoVariants } from "./components/logo-variants";
export { MenuItem, type MenuItemProps } from "./components/menu-item";
export { menuItemVariants } from "./components/menu-item-variants";
export { NavItem, type NavItemProps } from "./components/nav-item";
export { navItemVariants } from "./components/nav-item-variants";
export { PageHeader, type PageHeaderProps } from "./components/page-header";
export {
  Popover,
  PopoverTrigger,
  PopoverAnchor,
  PopoverClose,
  PopoverContent,
} from "./components/popover";
export { ResizeHandle, type ResizeHandleProps } from "./components/resize-handle";
export { resizeHandleVariants } from "./components/resize-handle-variants";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from "./components/select";
export {
  SegmentedControl,
  type SegmentedControlOption,
  type SegmentedControlProps,
} from "./components/segmented-control";
export { Sidebar, type SidebarProps } from "./components/sidebar";
// The read side of the collapsed state, for a consumer's own header/footer
// node. The context objects themselves stay internal: writing them would let
// an app claim a sidebar is collapsed while its width says otherwise.
export { useSidebarCollapsed } from "./components/sidebar-context";
export {
  SidebarUserMenu,
  type SidebarUserMenuProps,
} from "./components/sidebar-user-menu";
export { SidePanel, type SidePanelProps } from "./components/side-panel";
export {
  SIDE_PANEL_RAIL_WIDTH,
  sidePanelVariants,
} from "./components/side-panel-variants";
export { Spinner, type SpinnerProps } from "./components/spinner";
export { Stack, type StackProps } from "./components/stack";
export { stackVariants } from "./components/stack-variants";
export { Switch } from "./components/switch";
export {
  Table,
  type TableProps,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./components/table";
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "./components/tabs";
export { Textarea, type TextareaProps } from "./components/textarea";
export { ThemeToggle, type ThemeToggleProps } from "./components/theme-toggle";
/** App-wide appearance: Style (rounded / pill), contrast, accent colour. */
export {
  AppearanceProvider,
  UiShapeProvider,
  type AppearanceProviderProps,
  type UiShapeProviderProps,
} from "./components/ui-shape-provider";
export {
  useContrast,
  useAccent,
  ACCENT_COLORS,
  type AccentColor,
  type ContrastChoice,
  type ResolvedContrast,
  type ContrastContextValue,
  type AccentContextValue,
} from "./components/appearance-context";
export { AccentSwatch, type AccentSwatchProps } from "./components/accent-swatch";
export { useUiShape, type UiShape, type UiShapeContextValue } from "./components/ui-shape-context";
export { UiShapeToggle, type UiShapeToggleProps } from "./components/ui-shape-toggle";
/** Side-panel building blocks: row card, selection bar, collapsed rail. */
export {
  SidebarCard,
  SidebarCardList,
  SidebarSelectionBar,
  type SidebarCardProps,
  type SidebarCardListProps,
  type SidebarCardAction,
  type SidebarSelectionBarProps,
} from "./components/sidebar-card";
export { sidebarCardVariants, sidebarIconTileVariants, sidebarRowInset, sidebarRowInsetX } from "./components/sidebar-card-variants";
export { SidebarAction, type SidebarActionProps } from "./components/sidebar-action";
export { ActionMenu, type ActionMenuItem, type ActionMenuProps } from "./components/action-menu";
/** File drop target, and the window-wide "files are being dragged" signal that reveals it. */
export { FileDropzone, type FileDropzoneProps } from "./components/file-dropzone";
export { useWindowFileDrag } from "./lib/use-window-file-drag";
export { SidebarRail, SidebarRailItem, type SidebarRailItemProps } from "./components/sidebar-rail";
export { SidebarScrollArea, type SidebarScrollAreaProps } from "./components/sidebar-scroll-area";
/** One frame for both side columns: fixed head + the list that scrolls. */
export { SidebarPanel, type SidebarPanelProps } from "./components/sidebar-panel";
/** Keep a scroller's content at full width: the scrollbar goes into the right gutter. */
export { useScrollbarGutter } from "./lib/use-scrollbar-gutter";
/** Fade a scroller's content out at the edges that have more to scroll. */
export { useScrollFade } from "./lib/use-scroll-fade";
/** A panel that replaces a content area, and its titled sections. */
export { ContentPanel, PanelSection, type ContentPanelProps, type PanelSectionProps } from "./components/content-panel";
/** The settings window (section nav + search + rows). */
export { SettingsDialog, SettingsRow, type SettingsDialogProps, type SettingsSection, type SettingsRowProps } from "./components/settings-dialog";
export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastProps,
} from "./components/toast";
export {
  TOAST_DURATIONS,
  type ToastVariant,
} from "./components/toast-variants";
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./components/tooltip";
export {
  ThemeProvider,
  useTheme,
  type Theme,
  type ResolvedTheme,
  type ThemeProviderProps,
} from "./theme/ThemeContext";
export {
  AppShellLayout,
  type AppShellLayoutProps,
} from "./templates/app-shell-layout";
export { AuthLayout, type AuthLayoutProps } from "./templates/auth-layout";
export { authLayoutVariants } from "./templates/auth-layout-variants";
export { ChatLayout, type ChatLayoutProps } from "./templates/chat-layout";
export {
  DashboardLayout,
  type DashboardLayoutProps,
} from "./templates/dashboard-layout";
export { FormLayout, type FormLayoutProps } from "./templates/form-layout";
export {
  SectionedGridLayout,
  type SectionedGridLayoutProps,
  type SectionedGridSection,
  type SectionedGridSectionBase,
  type SectionedGridSectionBody,
} from "./templates/sectioned-grid-layout";
export { TableLayout, type TableLayoutProps } from "./templates/table-layout";
export {
  WorkspaceLayout,
  type WorkspaceLayoutProps,
  type WorkspacePane,
  type WorkspacePaneId,
  type WorkspaceMobileTab,
} from "./templates/workspace-layout";
export { cn } from "./lib/utils";
/**
 * The two shapes the responsive frames share (`AppShell`, `WorkspaceLayout`):
 * which of the three areas a narrow-screen tab shows, and a tab that declares
 * one. `WorkspacePaneId` / `WorkspaceMobileTab` are aliases of these and stay
 * exported for the call sites that already import them.
 */
export { type PaneId, type MobilePaneTab } from "./lib/pane-layout";
/**
 * The level type behind every template's `headingLevel` prop — exported so a
 * consumer wrapping a template can pass the prop through without restating
 * the union.
 */
export { type HeadingLevel } from "./lib/heading-level";
/**
 * Opt-in persistence for a column width (0.36.0): the piece a consumer plugs
 * into `AppShellLayout.leftWidth` + `leftResize.onWidthChange` (or any
 * `AppShellPanel` / `WorkspacePane`) so the user's size survives a reload, per
 * device. The components stay controlled — this is not a default inside them.
 */
export {
  usePersistedWidth,
  type PersistedWidthOptions,
} from "./lib/persisted-width";
/**
 * Composer (PromptInput): the chat input frame — textarea, tools row, submit,
 * attachments, action menu, model select. Vendored from Vercel AI Elements
 * (`registry.ai-sdk.dev/prompt-input`) and re-pointed to JLU tokens; speaks
 * the AI SDK vocabulary (`ChatStatus`, `FileUIPart`) so it plugs into
 * `useChat` unchanged. `InputGroup`, `Command`, `HoverCard` are its building
 * blocks and exported alongside.
 */
export * from "./components/prompt-input";
export {
  promptInputFrameVariants,
  promptInputControlShape,
  type PromptInputShape,
} from "./components/prompt-input-variants";
/** The column of a full-page chat: content, composer, pinned footer; centred while empty. */
export { ChatStage, type ChatStageProps } from "./components/chat-stage";
/** Starter prompts beneath the composer of an empty chat. */
export { PromptSuggestions, type PromptSuggestionsProps } from "./components/prompt-suggestions";
export {
  PromptInputAdaptiveTextarea,
  type PromptInputAdaptiveTextareaProps,
} from "./components/prompt-input-adaptive-textarea";
export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
} from "./components/input-group";
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "./components/command";
/**
 * A text field with a filterable, grouped listbox anchored under it (WAI-ARIA
 * APG combobox, list autocomplete) — cmdk for the list and keyboard model,
 * Radix Popover for anchoring and dismissal. Client- or server-filtered.
 */
export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxGroup,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxLoading,
  ComboboxSeparator,
  type ComboboxProps,
  type ComboboxInputProps,
  type ComboboxContentProps,
  type ComboboxListProps,
  type ComboboxLoadingProps,
} from "./components/combobox";
export { HoverCard, HoverCardTrigger, HoverCardContent } from "./components/hover-card";
export { PdfThumbnail, type PdfThumbnailProps } from "./components/pdf-thumbnail";
export { preloadPdfjs, renderPdfFirstPage, type RenderPdfFirstPageOptions } from "./lib/pdf-render";
export { usePdfPreviewImage } from "./lib/use-pdf-preview";
export { FilePreview, type FilePreviewProps } from "./components/file-preview";
export { PdfViewer, type PdfViewerProps, type PdfViewerLabels } from "./components/pdf-viewer";
