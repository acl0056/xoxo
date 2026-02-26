# Code Style and Linting Standards

## ESLint Configuration

This project uses Airbnb's JavaScript style guide as the base configuration with customizations for Vue 3 development.

### Base Configuration
- **Style Guide**: `airbnb-base`
- **Framework**: Vue 3 (`plugin:vue/vue3-recommended`)
- **Parser**: `vue-eslint-parser` with `@babel/eslint-parser`

### Key Style Rules

#### Indentation
- Use **tabs** for indentation (not spaces)
- Switch case statements should be indented one level

#### Import/Export
- Default exports are not required (`import/prefer-default-export: off`)
- File extensions should be omitted for `.js`, `.jsx`, `.ts`, `.tsx` imports
- Circular dependencies are allowed (`import/no-cycle: off`)

#### Code Practices
- Console statements are allowed (`no-console: off`)
- Debugger statements trigger warnings only
- Alert dialogs are forbidden (`no-alert: error`) - use toast notifications instead
- No maximum line length enforced (`max-len: off`)
- Parameter reassignment is allowed (`no-param-reassign: off`)
- Underscore dangles are allowed (`no-underscore-dangle: off`)
- Iterator syntax is allowed (`no-iterator: off`)
- For-of loops and other restricted syntax are allowed
- Increment/decrement operators (++/--) are allowed

#### Vue-Specific Rules
- Tab indentation for HTML templates
- Custom event name casing is not enforced
- Multiple template roots are allowed (Vue 3 feature)
- Unused components trigger errors
- Valid template root validation is disabled

#### Whitespace
- No trailing spaces (enforced as error)

### Path Aliases
- `@` is aliased to `./src` directory

### Global Variables
- `defineProps` and `defineEmits` are available as readonly globals (Vue 3 Composition API)

### Test Files
Jest environment is configured for test files matching:
- `**/__tests__/*.{j,t}s?(x)`
- `**/tests/unit/**/*.spec.{j,t}s?(x)`

## Naming Conventions
- **No abbreviations** except when they are vernacular or widely recognized in the domain
- Prioritize clarity and avoid ambiguity in variable, function, and class names
- **Prefer long, descriptive variable names** that clearly communicate intent
- No maximum line length constraint - prioritize readability over brevity
- Examples of acceptable abbreviations: `id`, `url`, `html`, `css`, `api` (common vernacular)
- Examples to avoid: `btn` (use `button`), `msg` (use `message`), `usr` (use `user`)

## When Writing Code
- Follow tab indentation consistently
- Keep imports clean and use path aliases where appropriate
- Leverage Vue 3 Composition API features
- Run ESLint to catch style violations before committing
- Use clear, unabbreviated names to maintain code readability
- Favor descriptive variable names even if they result in longer lines

## User Notifications
- Use toast notifications for user feedback (vue-toastification)
- Never use `alert()`, `confirm()`, or `prompt()` - they block the UI and provide poor UX
- Toast types:
  - `this.toast.success('message')` - for successful operations
  - `this.toast.error('message')` - for errors
  - `this.toast.warning('message')` - for warnings
  - `this.toast.info('message')` - for informational messages
- In Vue components using Options API, access toast via `this.toast` (provided by setup())
- Toast notifications are non-blocking, customizable, and provide better accessibility
