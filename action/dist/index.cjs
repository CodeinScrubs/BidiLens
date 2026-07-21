"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// action/src/main.ts
var import_node_process4 = __toESM(require("node:process"), 1);

// action/src/index.ts
var import_promises2 = require("node:fs/promises");
var import_node_crypto = require("node:crypto");
var import_node_path3 = require("node:path");
var import_node_process3 = __toESM(require("node:process"), 1);

// packages/cli/src/index.ts
var import_promises = require("node:fs/promises");
var import_node_path2 = require("node:path");
var import_node_process2 = __toESM(require("node:process"), 1);
var import_node_url = require("node:url");

// node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/error.js
var CommanderError = class extends Error {
  /**
   * Constructs the CommanderError class
   * @param {number} exitCode suggested exit code which could be used with process.exit
   * @param {string} code an id string representing the error
   * @param {string} message human-readable description of the error
   */
  constructor(exitCode, code, message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.code = code;
    this.exitCode = exitCode;
    this.nestedError = void 0;
  }
};
var InvalidArgumentError = class extends CommanderError {
  /**
   * Constructs the InvalidArgumentError class
   * @param {string} [message] explanation of why argument is invalid
   */
  constructor(message) {
    super(1, "commander.invalidArgument", message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
};

// node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/argument.js
var Argument = class {
  /**
   * Initialize a new command argument with the given name and description.
   * The default is that the argument is required, and you can explicitly
   * indicate this with <> around the name. Put [] around the name for an optional argument.
   *
   * @param {string} name
   * @param {string} [description]
   */
  constructor(name, description) {
    this.description = description || "";
    this.variadic = false;
    this.parseArg = void 0;
    this.defaultValue = void 0;
    this.defaultValueDescription = void 0;
    this.argChoices = void 0;
    switch (name[0]) {
      case "<":
        this.required = true;
        this._name = name.slice(1, -1);
        break;
      case "[":
        this.required = false;
        this._name = name.slice(1, -1);
        break;
      default:
        this.required = true;
        this._name = name;
        break;
    }
    if (this._name.endsWith("...")) {
      this.variadic = true;
      this._name = this._name.slice(0, -3);
    }
  }
  /**
   * Return argument name.
   *
   * @return {string}
   */
  name() {
    return this._name;
  }
  /**
   * @package
   */
  _collectValue(value, previous) {
    if (previous === this.defaultValue || !Array.isArray(previous)) {
      return [value];
    }
    previous.push(value);
    return previous;
  }
  /**
   * Set the default value, and optionally supply the description to be displayed in the help.
   *
   * @param {*} value
   * @param {string} [description]
   * @return {Argument}
   */
  default(value, description) {
    this.defaultValue = value;
    this.defaultValueDescription = description;
    return this;
  }
  /**
   * Set the custom handler for processing CLI command arguments into argument values.
   *
   * @param {Function} [fn]
   * @return {Argument}
   */
  argParser(fn) {
    this.parseArg = fn;
    return this;
  }
  /**
   * Only allow argument value to be one of choices.
   *
   * @param {string[]} values
   * @return {Argument}
   */
  choices(values) {
    this.argChoices = values.slice();
    this.parseArg = (arg, previous) => {
      if (!this.argChoices.includes(arg)) {
        throw new InvalidArgumentError(
          `Allowed choices are ${this.argChoices.join(", ")}.`
        );
      }
      if (this.variadic) {
        return this._collectValue(arg, previous);
      }
      return arg;
    };
    return this;
  }
  /**
   * Make argument required.
   *
   * @returns {Argument}
   */
  argRequired() {
    this.required = true;
    return this;
  }
  /**
   * Make argument optional.
   *
   * @returns {Argument}
   */
  argOptional() {
    this.required = false;
    return this;
  }
};
function humanReadableArgName(arg) {
  const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
  return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
}

// node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js
var import_node_events = require("node:events");
var import_node_child_process = __toESM(require("node:child_process"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_process = __toESM(require("node:process"), 1);
var import_node_util2 = require("node:util");

// node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/help.js
var import_node_util = require("node:util");
var Help = class {
  constructor() {
    this.helpWidth = void 0;
    this.minWidthToWrap = 40;
    this.sortSubcommands = false;
    this.sortOptions = false;
    this.showGlobalOptions = false;
  }
  /**
   * prepareContext is called by Commander after applying overrides from `Command.configureHelp()`
   * and just before calling `formatHelp()`.
   *
   * Commander just uses the helpWidth and the rest is provided for optional use by more complex subclasses.
   *
   * @param {{ error?: boolean, helpWidth?: number, outputHasColors?: boolean }} contextOptions
   */
  prepareContext(contextOptions) {
    this.helpWidth = this.helpWidth ?? contextOptions.helpWidth ?? 80;
  }
  /**
   * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
   *
   * @param {Command} cmd
   * @returns {Command[]}
   */
  visibleCommands(cmd) {
    const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
    const helpCommand = cmd._getHelpCommand();
    if (helpCommand && !helpCommand._hidden) {
      visibleCommands.push(helpCommand);
    }
    if (this.sortSubcommands) {
      visibleCommands.sort((a, b) => {
        return a.name().localeCompare(b.name());
      });
    }
    return visibleCommands;
  }
  /**
   * Compare options for sort.
   *
   * @param {Option} a
   * @param {Option} b
   * @returns {number}
   */
  compareOptions(a, b) {
    const getSortKey = (option) => {
      return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
    };
    return getSortKey(a).localeCompare(getSortKey(b));
  }
  /**
   * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
   *
   * @param {Command} cmd
   * @returns {Option[]}
   */
  visibleOptions(cmd) {
    const visibleOptions = cmd.options.filter((option) => !option.hidden);
    const helpOption = cmd._getHelpOption();
    if (helpOption && !helpOption.hidden) {
      const removeShort = helpOption.short && cmd._findOption(helpOption.short);
      const removeLong = helpOption.long && cmd._findOption(helpOption.long);
      if (!removeShort && !removeLong) {
        visibleOptions.push(helpOption);
      } else if (helpOption.long && !removeLong) {
        visibleOptions.push(
          cmd.createOption(helpOption.long, helpOption.description)
        );
      } else if (helpOption.short && !removeShort) {
        visibleOptions.push(
          cmd.createOption(helpOption.short, helpOption.description)
        );
      }
    }
    if (this.sortOptions) {
      visibleOptions.sort(this.compareOptions);
    }
    return visibleOptions;
  }
  /**
   * Get an array of the visible global options. (Not including help.)
   *
   * @param {Command} cmd
   * @returns {Option[]}
   */
  visibleGlobalOptions(cmd) {
    if (!this.showGlobalOptions) return [];
    const globalOptions = [];
    for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
      const visibleOptions = ancestorCmd.options.filter(
        (option) => !option.hidden
      );
      globalOptions.push(...visibleOptions);
    }
    if (this.sortOptions) {
      globalOptions.sort(this.compareOptions);
    }
    return globalOptions;
  }
  /**
   * Get an array of the arguments if any have a description.
   *
   * @param {Command} cmd
   * @returns {Argument[]}
   */
  visibleArguments(cmd) {
    if (cmd._argsDescription) {
      cmd.registeredArguments.forEach((argument) => {
        argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
      });
    }
    if (cmd.registeredArguments.find((argument) => argument.description)) {
      return cmd.registeredArguments;
    }
    return [];
  }
  /**
   * Get the command term to show in the list of subcommands.
   *
   * @param {Command} cmd
   * @returns {string}
   */
  subcommandTerm(cmd) {
    const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
    return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + // simplistic check for non-help option
    (args ? " " + args : "");
  }
  /**
   * Get the option term to show in the list of options.
   *
   * @param {Option} option
   * @returns {string}
   */
  optionTerm(option) {
    return option.flags;
  }
  /**
   * Get the argument term to show in the list of arguments.
   *
   * @param {Argument} argument
   * @returns {string}
   */
  argumentTerm(argument) {
    return argument.name();
  }
  /**
   * Get the longest command term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */
  longestSubcommandTermLength(cmd, helper) {
    return helper.visibleCommands(cmd).reduce((max, command) => {
      return Math.max(
        max,
        this.displayWidth(
          helper.styleSubcommandTerm(helper.subcommandTerm(command))
        )
      );
    }, 0);
  }
  /**
   * Get the longest option term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */
  longestOptionTermLength(cmd, helper) {
    return helper.visibleOptions(cmd).reduce((max, option) => {
      return Math.max(
        max,
        this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
      );
    }, 0);
  }
  /**
   * Get the longest global option term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */
  longestGlobalOptionTermLength(cmd, helper) {
    return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
      return Math.max(
        max,
        this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
      );
    }, 0);
  }
  /**
   * Get the longest argument term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */
  longestArgumentTermLength(cmd, helper) {
    return helper.visibleArguments(cmd).reduce((max, argument) => {
      return Math.max(
        max,
        this.displayWidth(
          helper.styleArgumentTerm(helper.argumentTerm(argument))
        )
      );
    }, 0);
  }
  /**
   * Get the command usage to be displayed at the top of the built-in help.
   *
   * @param {Command} cmd
   * @returns {string}
   */
  commandUsage(cmd) {
    let cmdName = cmd._name;
    if (cmd._aliases[0]) {
      cmdName = cmdName + "|" + cmd._aliases[0];
    }
    let ancestorCmdNames = "";
    for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
      ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
    }
    return ancestorCmdNames + cmdName + " " + cmd.usage();
  }
  /**
   * Get the description for the command.
   *
   * @param {Command} cmd
   * @returns {string}
   */
  commandDescription(cmd) {
    return cmd.description();
  }
  /**
   * Get the subcommand summary to show in the list of subcommands.
   * (Fallback to description for backwards compatibility.)
   *
   * @param {Command} cmd
   * @returns {string}
   */
  subcommandDescription(cmd) {
    return cmd.summary() || cmd.description();
  }
  /**
   * Get the option description to show in the list of options.
   *
   * @param {Option} option
   * @return {string}
   */
  optionDescription(option) {
    const extraInfo = [];
    if (option.argChoices) {
      extraInfo.push(
        // use stringify to match the display of the default value
        `choices: ${option.argChoices.map((choice2) => JSON.stringify(choice2)).join(", ")}`
      );
    }
    if (option.defaultValue !== void 0) {
      const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
      if (showDefault) {
        extraInfo.push(
          `default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`
        );
      }
    }
    if (option.presetArg !== void 0 && option.optional) {
      extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
    }
    if (option.envVar !== void 0) {
      extraInfo.push(`env: ${option.envVar}`);
    }
    if (extraInfo.length > 0) {
      const extraDescription = `(${extraInfo.join(", ")})`;
      if (option.description) {
        return `${option.description} ${extraDescription}`;
      }
      return extraDescription;
    }
    return option.description;
  }
  /**
   * Get the argument description to show in the list of arguments.
   *
   * @param {Argument} argument
   * @return {string}
   */
  argumentDescription(argument) {
    const extraInfo = [];
    if (argument.argChoices) {
      extraInfo.push(
        // use stringify to match the display of the default value
        `choices: ${argument.argChoices.map((choice2) => JSON.stringify(choice2)).join(", ")}`
      );
    }
    if (argument.defaultValue !== void 0) {
      extraInfo.push(
        `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`
      );
    }
    if (extraInfo.length > 0) {
      const extraDescription = `(${extraInfo.join(", ")})`;
      if (argument.description) {
        return `${argument.description} ${extraDescription}`;
      }
      return extraDescription;
    }
    return argument.description;
  }
  /**
   * Format a list of items, given a heading and an array of formatted items.
   *
   * @param {string} heading
   * @param {string[]} items
   * @param {Help} helper
   * @returns string[]
   */
  formatItemList(heading, items, helper) {
    if (items.length === 0) return [];
    return [helper.styleTitle(heading), ...items, ""];
  }
  /**
   * Group items by their help group heading.
   *
   * @param {Command[] | Option[]} unsortedItems
   * @param {Command[] | Option[]} visibleItems
   * @param {Function} getGroup
   * @returns {Map<string, Command[] | Option[]>}
   */
  groupItems(unsortedItems, visibleItems, getGroup) {
    const result = /* @__PURE__ */ new Map();
    unsortedItems.forEach((item) => {
      const group = getGroup(item);
      if (!result.has(group)) result.set(group, []);
    });
    visibleItems.forEach((item) => {
      const group = getGroup(item);
      if (!result.has(group)) {
        result.set(group, []);
      }
      result.get(group).push(item);
    });
    return result;
  }
  /**
   * Generate the built-in help text.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {string}
   */
  formatHelp(cmd, helper) {
    const termWidth = helper.padWidth(cmd, helper);
    const helpWidth = helper.helpWidth ?? 80;
    function callFormatItem(term, description) {
      return helper.formatItem(term, termWidth, description, helper);
    }
    let output = [
      `${helper.styleTitle("Usage:")} ${helper.styleUsage(helper.commandUsage(cmd))}`,
      ""
    ];
    const commandDescription = helper.commandDescription(cmd);
    if (commandDescription.length > 0) {
      output = output.concat([
        helper.boxWrap(
          helper.styleCommandDescription(commandDescription),
          helpWidth
        ),
        ""
      ]);
    }
    const argumentList = helper.visibleArguments(cmd).map((argument) => {
      return callFormatItem(
        helper.styleArgumentTerm(helper.argumentTerm(argument)),
        helper.styleArgumentDescription(helper.argumentDescription(argument))
      );
    });
    output = output.concat(
      this.formatItemList("Arguments:", argumentList, helper)
    );
    const optionGroups = this.groupItems(
      cmd.options,
      helper.visibleOptions(cmd),
      (option) => option.helpGroupHeading ?? "Options:"
    );
    optionGroups.forEach((options, group) => {
      const optionList = options.map((option) => {
        return callFormatItem(
          helper.styleOptionTerm(helper.optionTerm(option)),
          helper.styleOptionDescription(helper.optionDescription(option))
        );
      });
      output = output.concat(this.formatItemList(group, optionList, helper));
    });
    if (helper.showGlobalOptions) {
      const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
        return callFormatItem(
          helper.styleOptionTerm(helper.optionTerm(option)),
          helper.styleOptionDescription(helper.optionDescription(option))
        );
      });
      output = output.concat(
        this.formatItemList("Global Options:", globalOptionList, helper)
      );
    }
    const commandGroups = this.groupItems(
      cmd.commands,
      helper.visibleCommands(cmd),
      (sub) => sub.helpGroup() || "Commands:"
    );
    commandGroups.forEach((commands, group) => {
      const commandList = commands.map((sub) => {
        return callFormatItem(
          helper.styleSubcommandTerm(helper.subcommandTerm(sub)),
          helper.styleSubcommandDescription(helper.subcommandDescription(sub))
        );
      });
      output = output.concat(this.formatItemList(group, commandList, helper));
    });
    return output.join("\n");
  }
  /**
   * Return display width of string, ignoring ANSI escape sequences. Used in padding and wrapping calculations.
   *
   * @param {string} str
   * @returns {number}
   */
  displayWidth(str) {
    return (0, import_node_util.stripVTControlCharacters)(str).length;
  }
  /**
   * Style the title for displaying in the help. Called with 'Usage:', 'Options:', etc.
   *
   * @param {string} str
   * @returns {string}
   */
  styleTitle(str) {
    return str;
  }
  styleUsage(str) {
    return str.split(" ").map((word) => {
      if (word === "[options]") return this.styleOptionText(word);
      if (word === "[command]") return this.styleSubcommandText(word);
      if (word[0] === "[" || word[0] === "<")
        return this.styleArgumentText(word);
      return this.styleCommandText(word);
    }).join(" ");
  }
  styleCommandDescription(str) {
    return this.styleDescriptionText(str);
  }
  styleOptionDescription(str) {
    return this.styleDescriptionText(str);
  }
  styleSubcommandDescription(str) {
    return this.styleDescriptionText(str);
  }
  styleArgumentDescription(str) {
    return this.styleDescriptionText(str);
  }
  styleDescriptionText(str) {
    return str;
  }
  styleOptionTerm(str) {
    return this.styleOptionText(str);
  }
  styleSubcommandTerm(str) {
    return str.split(" ").map((word) => {
      if (word === "[options]") return this.styleOptionText(word);
      if (word[0] === "[" || word[0] === "<")
        return this.styleArgumentText(word);
      return this.styleSubcommandText(word);
    }).join(" ");
  }
  styleArgumentTerm(str) {
    return this.styleArgumentText(str);
  }
  styleOptionText(str) {
    return str;
  }
  styleArgumentText(str) {
    return str;
  }
  styleSubcommandText(str) {
    return str;
  }
  styleCommandText(str) {
    return str;
  }
  /**
   * Calculate the pad width from the maximum term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */
  padWidth(cmd, helper) {
    return Math.max(
      helper.longestOptionTermLength(cmd, helper),
      helper.longestGlobalOptionTermLength(cmd, helper),
      helper.longestSubcommandTermLength(cmd, helper),
      helper.longestArgumentTermLength(cmd, helper)
    );
  }
  /**
   * Detect manually wrapped and indented strings by checking for line break followed by whitespace.
   *
   * @param {string} str
   * @returns {boolean}
   */
  preformatted(str) {
    return /\n[^\S\r\n]/.test(str);
  }
  /**
   * Format the "item", which consists of a term and description. Pad the term and wrap the description, indenting the following lines.
   *
   * So "TTT", 5, "DDD DDDD DD DDD" might be formatted for this.helpWidth=17 like so:
   *   TTT  DDD DDDD
   *        DD DDD
   *
   * @param {string} term
   * @param {number} termWidth
   * @param {string} description
   * @param {Help} helper
   * @returns {string}
   */
  formatItem(term, termWidth, description, helper) {
    const itemIndent = 2;
    const itemIndentStr = " ".repeat(itemIndent);
    if (!description) return itemIndentStr + term;
    const paddedTerm = term.padEnd(
      termWidth + term.length - helper.displayWidth(term)
    );
    const spacerWidth = 2;
    const helpWidth = this.helpWidth ?? 80;
    const remainingWidth = helpWidth - termWidth - spacerWidth - itemIndent;
    let formattedDescription;
    if (remainingWidth < this.minWidthToWrap || helper.preformatted(description)) {
      formattedDescription = description;
    } else {
      const wrappedDescription = helper.boxWrap(description, remainingWidth);
      formattedDescription = wrappedDescription.replace(
        /\n/g,
        "\n" + " ".repeat(termWidth + spacerWidth)
      );
    }
    return itemIndentStr + paddedTerm + " ".repeat(spacerWidth) + formattedDescription.replace(/\n/g, `
${itemIndentStr}`);
  }
  /**
   * Wrap a string at whitespace, preserving existing line breaks.
   * Wrapping is skipped if the width is less than `minWidthToWrap`.
   *
   * @param {string} str
   * @param {number} width
   * @returns {string}
   */
  boxWrap(str, width) {
    if (width < this.minWidthToWrap) return str;
    const rawLines = str.split(/\r\n|\n/);
    const chunkPattern = /[\s]*[^\s]+/g;
    const wrappedLines = [];
    rawLines.forEach((line2) => {
      const chunks = line2.match(chunkPattern);
      if (chunks === null) {
        wrappedLines.push("");
        return;
      }
      let sumChunks = [chunks.shift()];
      let sumWidth = this.displayWidth(sumChunks[0]);
      chunks.forEach((chunk) => {
        const visibleWidth = this.displayWidth(chunk);
        if (sumWidth + visibleWidth <= width) {
          sumChunks.push(chunk);
          sumWidth += visibleWidth;
          return;
        }
        wrappedLines.push(sumChunks.join(""));
        const nextChunk = chunk.trimStart();
        sumChunks = [nextChunk];
        sumWidth = this.displayWidth(nextChunk);
      });
      wrappedLines.push(sumChunks.join(""));
    });
    return wrappedLines.join("\n");
  }
};

// node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/option.js
var Option = class {
  /**
   * Initialize a new `Option` with the given `flags` and `description`.
   *
   * @param {string} flags
   * @param {string} [description]
   */
  constructor(flags, description) {
    this.flags = flags;
    this.description = description || "";
    this.required = flags.includes("<");
    this.optional = flags.includes("[");
    this.variadic = /\w\.\.\.[>\]]$/.test(flags);
    this.mandatory = false;
    const optionFlags = splitOptionFlags(flags);
    this.short = optionFlags.shortFlag;
    this.long = optionFlags.longFlag;
    this.negate = false;
    if (this.long) {
      this.negate = this.long.startsWith("--no-");
    }
    this.defaultValue = void 0;
    this.defaultValueDescription = void 0;
    this.presetArg = void 0;
    this.envVar = void 0;
    this.parseArg = void 0;
    this.hidden = false;
    this.argChoices = void 0;
    this.conflictsWith = [];
    this.implied = void 0;
    this.helpGroupHeading = void 0;
  }
  /**
   * Set the default value, and optionally supply the description to be displayed in the help.
   *
   * @param {*} value
   * @param {string} [description]
   * @return {Option}
   */
  default(value, description) {
    this.defaultValue = value;
    this.defaultValueDescription = description;
    return this;
  }
  /**
   * Preset to use when option used without option-argument, especially optional but also boolean and negated.
   * The custom processing (parseArg) is called.
   *
   * @example
   * new Option('--color').default('GREYSCALE').preset('RGB');
   * new Option('--donate [amount]').preset('20').argParser(parseFloat);
   *
   * @param {*} arg
   * @return {Option}
   */
  preset(arg) {
    this.presetArg = arg;
    return this;
  }
  /**
   * Add option name(s) that conflict with this option.
   * An error will be displayed if conflicting options are found during parsing.
   *
   * @example
   * new Option('--rgb').conflicts('cmyk');
   * new Option('--js').conflicts(['ts', 'jsx']);
   *
   * @param {(string | string[])} names
   * @return {Option}
   */
  conflicts(names) {
    this.conflictsWith = this.conflictsWith.concat(names);
    return this;
  }
  /**
   * Specify implied option values for when this option is set and the implied options are not.
   *
   * The custom processing (parseArg) is not called on the implied values.
   *
   * @example
   * program
   *   .addOption(new Option('--log', 'write logging information to file'))
   *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
   *
   * @param {object} impliedOptionValues
   * @return {Option}
   */
  implies(impliedOptionValues) {
    let newImplied = impliedOptionValues;
    if (typeof impliedOptionValues === "string") {
      newImplied = { [impliedOptionValues]: true };
    }
    this.implied = Object.assign(this.implied || {}, newImplied);
    return this;
  }
  /**
   * Set environment variable to check for option value.
   *
   * An environment variable is only used if when processed the current option value is
   * undefined, or the source of the current value is 'default' or 'config' or 'env'.
   *
   * @param {string} name
   * @return {Option}
   */
  env(name) {
    this.envVar = name;
    return this;
  }
  /**
   * Set the custom handler for processing CLI option arguments into option values.
   *
   * @param {Function} [fn]
   * @return {Option}
   */
  argParser(fn) {
    this.parseArg = fn;
    return this;
  }
  /**
   * Whether the option is mandatory and must have a value after parsing.
   *
   * @param {boolean} [mandatory=true]
   * @return {Option}
   */
  makeOptionMandatory(mandatory = true) {
    this.mandatory = !!mandatory;
    return this;
  }
  /**
   * Hide option in help.
   *
   * @param {boolean} [hide=true]
   * @return {Option}
   */
  hideHelp(hide = true) {
    this.hidden = !!hide;
    return this;
  }
  /**
   * @package
   */
  _collectValue(value, previous) {
    if (previous === this.defaultValue || !Array.isArray(previous)) {
      return [value];
    }
    previous.push(value);
    return previous;
  }
  /**
   * Only allow option value to be one of choices.
   *
   * @param {string[]} values
   * @return {Option}
   */
  choices(values) {
    this.argChoices = values.slice();
    this.parseArg = (arg, previous) => {
      if (!this.argChoices.includes(arg)) {
        throw new InvalidArgumentError(
          `Allowed choices are ${this.argChoices.join(", ")}.`
        );
      }
      if (this.variadic) {
        return this._collectValue(arg, previous);
      }
      return arg;
    };
    return this;
  }
  /**
   * Return option name.
   *
   * @return {string}
   */
  name() {
    if (this.long) {
      return this.long.replace(/^--/, "");
    }
    return this.short.replace(/^-/, "");
  }
  /**
   * Return option name, in a camelcase format that can be used
   * as an object attribute key.
   *
   * @return {string}
   */
  attributeName() {
    if (this.negate) {
      return camelcase(this.name().replace(/^no-/, ""));
    }
    return camelcase(this.name());
  }
  /**
   * Set the help group heading.
   *
   * @param {string} heading
   * @return {Option}
   */
  helpGroup(heading) {
    this.helpGroupHeading = heading;
    return this;
  }
  /**
   * Check if `arg` matches the short or long flag.
   *
   * @param {string} arg
   * @return {boolean}
   * @package
   */
  is(arg) {
    return this.short === arg || this.long === arg;
  }
  /**
   * Return whether a boolean option.
   *
   * Options are one of boolean, negated, required argument, or optional argument.
   *
   * @return {boolean}
   * @package
   */
  isBoolean() {
    return !this.required && !this.optional && !this.negate;
  }
};
var DualOptions = class {
  /**
   * @param {Option[]} options
   */
  constructor(options) {
    this.positiveOptions = /* @__PURE__ */ new Map();
    this.negativeOptions = /* @__PURE__ */ new Map();
    this.dualOptions = /* @__PURE__ */ new Set();
    options.forEach((option) => {
      if (option.negate) {
        this.negativeOptions.set(option.attributeName(), option);
      } else {
        this.positiveOptions.set(option.attributeName(), option);
      }
    });
    this.negativeOptions.forEach((value, key) => {
      if (this.positiveOptions.has(key)) {
        this.dualOptions.add(key);
      }
    });
  }
  /**
   * Did the value come from the option, and not from possible matching dual option?
   *
   * @param {*} value
   * @param {Option} option
   * @returns {boolean}
   */
  valueFromOption(value, option) {
    const optionKey = option.attributeName();
    if (!this.dualOptions.has(optionKey)) return true;
    const preset = this.negativeOptions.get(optionKey).presetArg;
    const negativeValue = preset !== void 0 ? preset : false;
    return option.negate === (negativeValue === value);
  }
};
function camelcase(str) {
  return str.split("-").reduce((str2, word) => {
    return str2 + word[0].toUpperCase() + word.slice(1);
  });
}
function splitOptionFlags(flags) {
  let shortFlag;
  let longFlag;
  const shortFlagExp = /^-[^-]$/;
  const longFlagExp = /^--[^-]/;
  const flagParts = flags.split(/[ |,]+/).concat("guard");
  if (shortFlagExp.test(flagParts[0])) shortFlag = flagParts.shift();
  if (longFlagExp.test(flagParts[0])) longFlag = flagParts.shift();
  if (!shortFlag && shortFlagExp.test(flagParts[0]))
    shortFlag = flagParts.shift();
  if (!shortFlag && longFlagExp.test(flagParts[0])) {
    shortFlag = longFlag;
    longFlag = flagParts.shift();
  }
  if (flagParts[0].startsWith("-")) {
    const unsupportedFlag = flagParts[0];
    const baseError = `option creation failed due to '${unsupportedFlag}' in option flags '${flags}'`;
    if (/^-[^-][^-]/.test(unsupportedFlag))
      throw new Error(
        `${baseError}
- a short flag is a single dash and a single character
  - either use a single dash and a single character (for a short flag)
  - or use a double dash for a long option (and can have two, like '--ws, --workspace')`
      );
    if (shortFlagExp.test(unsupportedFlag))
      throw new Error(`${baseError}
- too many short flags`);
    if (longFlagExp.test(unsupportedFlag))
      throw new Error(`${baseError}
- too many long flags`);
    throw new Error(`${baseError}
- unrecognised flag format`);
  }
  if (shortFlag === void 0 && longFlag === void 0)
    throw new Error(
      `option creation failed due to no flags found in '${flags}'.`
    );
  return { shortFlag, longFlag };
}

// node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/suggestSimilar.js
var maxDistance = 3;
function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > maxDistance)
    return Math.max(a.length, b.length);
  const d = [];
  for (let i = 0; i <= a.length; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    d[0][j] = j;
  }
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      let cost;
      if (a[i - 1] === b[j - 1]) {
        cost = 0;
      } else {
        cost = 1;
      }
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        // deletion
        d[i][j - 1] + 1,
        // insertion
        d[i - 1][j - 1] + cost
        // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}
function suggestSimilar(word, candidates) {
  if (!candidates || candidates.length === 0) return "";
  candidates = Array.from(new Set(candidates));
  const searchingOptions = word.startsWith("--");
  if (searchingOptions) {
    word = word.slice(2);
    candidates = candidates.map((candidate) => candidate.slice(2));
  }
  let similar = [];
  let bestDistance = maxDistance;
  const minSimilarity = 0.4;
  candidates.forEach((candidate) => {
    if (candidate.length <= 1) return;
    const distance = editDistance(word, candidate);
    const length = Math.max(word.length, candidate.length);
    const similarity = (length - distance) / length;
    if (similarity > minSimilarity) {
      if (distance < bestDistance) {
        bestDistance = distance;
        similar = [candidate];
      } else if (distance === bestDistance) {
        similar.push(candidate);
      }
    }
  });
  similar.sort((a, b) => a.localeCompare(b));
  if (searchingOptions) {
    similar = similar.map((candidate) => `--${candidate}`);
  }
  if (similar.length > 1) {
    return `
(Did you mean one of ${similar.join(", ")}?)`;
  }
  if (similar.length === 1) {
    return `
(Did you mean ${similar[0]}?)`;
  }
  return "";
}

// node_modules/.pnpm/commander@15.0.0/node_modules/commander/lib/command.js
var Command = class _Command extends import_node_events.EventEmitter {
  /**
   * Initialize a new `Command`.
   *
   * @param {string} [name]
   */
  constructor(name) {
    super();
    this.commands = [];
    this.options = [];
    this.parent = null;
    this._allowUnknownOption = false;
    this._allowExcessArguments = false;
    this.registeredArguments = [];
    this._args = this.registeredArguments;
    this.args = [];
    this.rawArgs = [];
    this.processedArgs = [];
    this._scriptPath = null;
    this._name = name || "";
    this._optionValues = {};
    this._optionValueSources = {};
    this._storeOptionsAsProperties = false;
    this._actionHandler = null;
    this._executableHandler = false;
    this._executableFile = null;
    this._executableDir = null;
    this._defaultCommandName = null;
    this._exitCallback = null;
    this._aliases = [];
    this._combineFlagAndOptionalValue = true;
    this._description = "";
    this._summary = "";
    this._argsDescription = void 0;
    this._enablePositionalOptions = false;
    this._passThroughOptions = false;
    this._lifeCycleHooks = {};
    this._showHelpAfterError = false;
    this._showSuggestionAfterError = true;
    this._savedState = null;
    this._outputConfiguration = {
      writeOut: (str) => import_node_process.default.stdout.write(str),
      writeErr: (str) => import_node_process.default.stderr.write(str),
      outputError: (str, write) => write(str),
      getOutHelpWidth: () => import_node_process.default.stdout.isTTY ? import_node_process.default.stdout.columns : void 0,
      getErrHelpWidth: () => import_node_process.default.stderr.isTTY ? import_node_process.default.stderr.columns : void 0,
      getOutHasColors: () => useColor() ?? (import_node_process.default.stdout.isTTY && import_node_process.default.stdout.hasColors?.()),
      getErrHasColors: () => useColor() ?? (import_node_process.default.stderr.isTTY && import_node_process.default.stderr.hasColors?.()),
      stripColor: (str) => (0, import_node_util2.stripVTControlCharacters)(str)
    };
    this._hidden = false;
    this._helpOption = void 0;
    this._addImplicitHelpCommand = void 0;
    this._helpCommand = void 0;
    this._helpConfiguration = {};
    this._helpGroupHeading = void 0;
    this._defaultCommandGroup = void 0;
    this._defaultOptionGroup = void 0;
  }
  /**
   * Copy settings that are useful to have in common across root command and subcommands.
   *
   * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
   *
   * @param {Command} sourceCommand
   * @return {Command} `this` command for chaining
   */
  copyInheritedSettings(sourceCommand) {
    this._outputConfiguration = sourceCommand._outputConfiguration;
    this._helpOption = sourceCommand._helpOption;
    this._helpCommand = sourceCommand._helpCommand;
    this._helpConfiguration = sourceCommand._helpConfiguration;
    this._exitCallback = sourceCommand._exitCallback;
    this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
    this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
    this._allowExcessArguments = sourceCommand._allowExcessArguments;
    this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
    this._showHelpAfterError = sourceCommand._showHelpAfterError;
    this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
    return this;
  }
  /**
   * @returns {Command[]}
   * @private
   */
  _getCommandAndAncestors() {
    const result = [];
    for (let command = this; command; command = command.parent) {
      result.push(command);
    }
    return result;
  }
  /**
   * Define a command.
   *
   * There are two styles of command: pay attention to where to put the description.
   *
   * @example
   * // Command implemented using action handler (description is supplied separately to `.command`)
   * program
   *   .command('clone <source> [destination]')
   *   .description('clone a repository into a newly created directory')
   *   .action((source, destination) => {
   *     console.log('clone command called');
   *   });
   *
   * // Command implemented using separate executable file (description is second parameter to `.command`)
   * program
   *   .command('start <service>', 'start named service')
   *   .command('stop [service]', 'stop named service, or all if no name supplied');
   *
   * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
   * @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
   * @param {object} [execOpts] - configuration options (for executable)
   * @return {Command} returns new command for action handler, or `this` for executable command
   */
  command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
    let desc = actionOptsOrExecDesc;
    let opts = execOpts;
    if (typeof desc === "object" && desc !== null) {
      opts = desc;
      desc = null;
    }
    opts = opts || {};
    const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
    const cmd = this.createCommand(name);
    if (desc) {
      cmd.description(desc);
      cmd._executableHandler = true;
    }
    if (opts.isDefault) this._defaultCommandName = cmd._name;
    cmd._hidden = !!(opts.noHelp || opts.hidden);
    cmd._executableFile = opts.executableFile || null;
    if (args) cmd.arguments(args);
    this._registerCommand(cmd);
    cmd.parent = this;
    cmd.copyInheritedSettings(this);
    if (desc) return this;
    return cmd;
  }
  /**
   * Factory routine to create a new unattached command.
   *
   * See .command() for creating an attached subcommand, which uses this routine to
   * create the command. You can override createCommand to customise subcommands.
   *
   * @param {string} [name]
   * @return {Command} new command
   */
  createCommand(name) {
    return new _Command(name);
  }
  /**
   * You can customise the help with a subclass of Help by overriding createHelp,
   * or by overriding Help properties using configureHelp().
   *
   * @return {Help}
   */
  createHelp() {
    return Object.assign(new Help(), this.configureHelp());
  }
  /**
   * You can customise the help by overriding Help properties using configureHelp(),
   * or with a subclass of Help by overriding createHelp().
   *
   * @param {object} [configuration] - configuration options
   * @return {(Command | object)} `this` command for chaining, or stored configuration
   */
  configureHelp(configuration) {
    if (configuration === void 0) return this._helpConfiguration;
    this._helpConfiguration = configuration;
    return this;
  }
  /**
   * The default output goes to stdout and stderr. You can customise this for special
   * applications. You can also customise the display of errors by overriding outputError.
   *
   * The configuration properties are all functions:
   *
   *     // change how output being written, defaults to stdout and stderr
   *     writeOut(str)
   *     writeErr(str)
   *     // change how output being written for errors, defaults to writeErr
   *     outputError(str, write) // used for displaying errors and not used for displaying help
   *     // specify width for wrapping help
   *     getOutHelpWidth()
   *     getErrHelpWidth()
   *     // color support, currently only used with Help
   *     getOutHasColors()
   *     getErrHasColors()
   *     stripColor() // used to remove ANSI escape codes if output does not have colors
   *
   * @param {object} [configuration] - configuration options
   * @return {(Command | object)} `this` command for chaining, or stored configuration
   */
  configureOutput(configuration) {
    if (configuration === void 0) return this._outputConfiguration;
    this._outputConfiguration = {
      ...this._outputConfiguration,
      ...configuration
    };
    return this;
  }
  /**
   * Display the help or a custom message after an error occurs.
   *
   * @param {(boolean|string)} [displayHelp]
   * @return {Command} `this` command for chaining
   */
  showHelpAfterError(displayHelp = true) {
    if (typeof displayHelp !== "string") displayHelp = !!displayHelp;
    this._showHelpAfterError = displayHelp;
    return this;
  }
  /**
   * Display suggestion of similar commands for unknown commands, or options for unknown options.
   *
   * @param {boolean} [displaySuggestion]
   * @return {Command} `this` command for chaining
   */
  showSuggestionAfterError(displaySuggestion = true) {
    this._showSuggestionAfterError = !!displaySuggestion;
    return this;
  }
  /**
   * Add a prepared subcommand.
   *
   * See .command() for creating an attached subcommand which inherits settings from its parent.
   *
   * @param {Command} cmd - new subcommand
   * @param {object} [opts] - configuration options
   * @return {Command} `this` command for chaining
   */
  addCommand(cmd, opts) {
    if (!cmd._name) {
      throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
    }
    opts = opts || {};
    if (opts.isDefault) this._defaultCommandName = cmd._name;
    if (opts.noHelp || opts.hidden) cmd._hidden = true;
    this._registerCommand(cmd);
    cmd.parent = this;
    cmd._checkForBrokenPassThrough();
    return this;
  }
  /**
   * Factory routine to create a new unattached argument.
   *
   * See .argument() for creating an attached argument, which uses this routine to
   * create the argument. You can override createArgument to return a custom argument.
   *
   * @param {string} name
   * @param {string} [description]
   * @return {Argument} new argument
   */
  createArgument(name, description) {
    return new Argument(name, description);
  }
  /**
   * Define argument syntax for command.
   *
   * The default is that the argument is required, and you can explicitly
   * indicate this with <> around the name. Put [] around the name for an optional argument.
   *
   * @example
   * program.argument('<input-file>');
   * program.argument('[output-file]');
   *
   * @param {string} name
   * @param {string} [description]
   * @param {(Function|*)} [parseArg] - custom argument processing function or default value
   * @param {*} [defaultValue]
   * @return {Command} `this` command for chaining
   */
  argument(name, description, parseArg, defaultValue) {
    const argument = this.createArgument(name, description);
    if (typeof parseArg === "function") {
      argument.default(defaultValue).argParser(parseArg);
    } else {
      argument.default(parseArg);
    }
    this.addArgument(argument);
    return this;
  }
  /**
   * Define argument syntax for command, adding multiple at once (without descriptions).
   *
   * See also .argument().
   *
   * @example
   * program.arguments('<cmd> [env]');
   *
   * @param {string} names
   * @return {Command} `this` command for chaining
   */
  arguments(names) {
    names.trim().split(/ +/).forEach((detail) => {
      this.argument(detail);
    });
    return this;
  }
  /**
   * Define argument syntax for command, adding a prepared argument.
   *
   * @param {Argument} argument
   * @return {Command} `this` command for chaining
   */
  addArgument(argument) {
    const previousArgument = this.registeredArguments.slice(-1)[0];
    if (previousArgument?.variadic) {
      throw new Error(
        `only the last argument can be variadic '${previousArgument.name()}'`
      );
    }
    if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0) {
      throw new Error(
        `a default value for a required argument is never used: '${argument.name()}'`
      );
    }
    this.registeredArguments.push(argument);
    return this;
  }
  /**
   * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
   *
   * @example
   *    program.helpCommand('help [cmd]');
   *    program.helpCommand('help [cmd]', 'show help');
   *    program.helpCommand(false); // suppress default help command
   *    program.helpCommand(true); // add help command even if no subcommands
   *
   * @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
   * @param {string} [description] - custom description
   * @return {Command} `this` command for chaining
   */
  helpCommand(enableOrNameAndArgs, description) {
    if (typeof enableOrNameAndArgs === "boolean") {
      this._addImplicitHelpCommand = enableOrNameAndArgs;
      if (enableOrNameAndArgs && this._defaultCommandGroup) {
        this._initCommandGroup(this._getHelpCommand());
      }
      return this;
    }
    const nameAndArgs = enableOrNameAndArgs ?? "help [command]";
    const [, helpName, helpArgs] = nameAndArgs.match(/([^ ]+) *(.*)/);
    const helpDescription = description ?? "display help for command";
    const helpCommand = this.createCommand(helpName);
    helpCommand.helpOption(false);
    if (helpArgs) helpCommand.arguments(helpArgs);
    if (helpDescription) helpCommand.description(helpDescription);
    this._addImplicitHelpCommand = true;
    this._helpCommand = helpCommand;
    if (enableOrNameAndArgs || description) this._initCommandGroup(helpCommand);
    return this;
  }
  /**
   * Add prepared custom help command.
   *
   * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
   * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
   * @return {Command} `this` command for chaining
   */
  addHelpCommand(helpCommand, deprecatedDescription) {
    if (typeof helpCommand !== "object") {
      this.helpCommand(helpCommand, deprecatedDescription);
      return this;
    }
    this._addImplicitHelpCommand = true;
    this._helpCommand = helpCommand;
    this._initCommandGroup(helpCommand);
    return this;
  }
  /**
   * Lazy create help command.
   *
   * @return {(Command|null)}
   * @package
   */
  _getHelpCommand() {
    const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
    if (hasImplicitHelpCommand) {
      if (this._helpCommand === void 0) {
        this.helpCommand(void 0, void 0);
      }
      return this._helpCommand;
    }
    return null;
  }
  /**
   * Add hook for life cycle event.
   *
   * @param {string} event
   * @param {Function} listener
   * @return {Command} `this` command for chaining
   */
  hook(event, listener) {
    const allowedValues = ["preSubcommand", "preAction", "postAction"];
    if (!allowedValues.includes(event)) {
      throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
    }
    if (this._lifeCycleHooks[event]) {
      this._lifeCycleHooks[event].push(listener);
    } else {
      this._lifeCycleHooks[event] = [listener];
    }
    return this;
  }
  /**
   * Register callback to use as replacement for calling process.exit.
   *
   * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
   * @return {Command} `this` command for chaining
   */
  exitOverride(fn) {
    if (fn) {
      this._exitCallback = fn;
    } else {
      this._exitCallback = (err) => {
        if (err.code !== "commander.executeSubCommandAsync") {
          throw err;
        } else {
        }
      };
    }
    return this;
  }
  /**
   * Call process.exit, and _exitCallback if defined.
   *
   * @param {number} exitCode exit code for using with process.exit
   * @param {string} code an id string representing the error
   * @param {string} message human-readable description of the error
   * @return never
   * @private
   */
  _exit(exitCode, code, message) {
    if (this._exitCallback) {
      this._exitCallback(new CommanderError(exitCode, code, message));
    }
    import_node_process.default.exit(exitCode);
  }
  /**
   * Register callback `fn` for the command.
   *
   * @example
   * program
   *   .command('serve')
   *   .description('start service')
   *   .action(function() {
   *      // do work here
   *   });
   *
   * @param {Function} fn
   * @return {Command} `this` command for chaining
   */
  action(fn) {
    const listener = (args) => {
      const expectedArgsCount = this.registeredArguments.length;
      const actionArgs = args.slice(0, expectedArgsCount);
      if (this._storeOptionsAsProperties) {
        actionArgs[expectedArgsCount] = this;
      } else {
        actionArgs[expectedArgsCount] = this.opts();
      }
      actionArgs.push(this);
      return fn.apply(this, actionArgs);
    };
    this._actionHandler = listener;
    return this;
  }
  /**
   * Factory routine to create a new unattached option.
   *
   * See .option() for creating an attached option, which uses this routine to
   * create the option. You can override createOption to return a custom option.
   *
   * @param {string} flags
   * @param {string} [description]
   * @return {Option} new option
   */
  createOption(flags, description) {
    return new Option(flags, description);
  }
  /**
   * Wrap parseArgs to catch 'commander.invalidArgument'.
   *
   * @param {(Option | Argument)} target
   * @param {string} value
   * @param {*} previous
   * @param {string} invalidArgumentMessage
   * @private
   */
  _callParseArg(target, value, previous, invalidArgumentMessage) {
    try {
      return target.parseArg(value, previous);
    } catch (err) {
      if (err.code === "commander.invalidArgument") {
        const message = `${invalidArgumentMessage} ${err.message}`;
        this.error(message, { exitCode: err.exitCode, code: err.code });
      }
      throw err;
    }
  }
  /**
   * Check for option flag conflicts.
   * Register option if no conflicts found, or throw on conflict.
   *
   * @param {Option} option
   * @private
   */
  _registerOption(option) {
    const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
    if (matchingOption) {
      const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
      throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
    }
    this._initOptionGroup(option);
    this.options.push(option);
  }
  /**
   * Check for command name and alias conflicts with existing commands.
   * Register command if no conflicts found, or throw on conflict.
   *
   * @param {Command} command
   * @private
   */
  _registerCommand(command) {
    const knownBy = (cmd) => {
      return [cmd.name()].concat(cmd.aliases());
    };
    const alreadyUsed = knownBy(command).find(
      (name) => this._findCommand(name)
    );
    if (alreadyUsed) {
      const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
      const newCmd = knownBy(command).join("|");
      throw new Error(
        `cannot add command '${newCmd}' as already have command '${existingCmd}'`
      );
    }
    this._initCommandGroup(command);
    this.commands.push(command);
  }
  /**
   * Add an option.
   *
   * @param {Option} option
   * @return {Command} `this` command for chaining
   */
  addOption(option) {
    this._registerOption(option);
    const oname = option.name();
    const name = option.attributeName();
    if (option.defaultValue !== void 0) {
      this.setOptionValueWithSource(name, option.defaultValue, "default");
    }
    const handleOptionValue = (val, invalidValueMessage, valueSource) => {
      if (val == null && option.presetArg !== void 0) {
        val = option.presetArg;
      }
      const oldValue = this.getOptionValue(name);
      if (val !== null && option.parseArg) {
        val = this._callParseArg(option, val, oldValue, invalidValueMessage);
      } else if (val !== null && option.variadic) {
        val = option._collectValue(val, oldValue);
      }
      if (val == null) {
        if (option.negate) {
          val = false;
        } else if (option.isBoolean() || option.optional) {
          val = true;
        } else {
          val = "";
        }
      }
      this.setOptionValueWithSource(name, val, valueSource);
    };
    this.on("option:" + oname, (val) => {
      const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
      handleOptionValue(val, invalidValueMessage, "cli");
    });
    if (option.envVar) {
      this.on("optionEnv:" + oname, (val) => {
        const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
        handleOptionValue(val, invalidValueMessage, "env");
      });
    }
    return this;
  }
  /**
   * Internal implementation shared by .option() and .requiredOption()
   *
   * @return {Command} `this` command for chaining
   * @private
   */
  _optionEx(config, flags, description, fn, defaultValue) {
    if (typeof flags === "object" && flags instanceof Option) {
      throw new Error(
        "To add an Option object use addOption() instead of option() or requiredOption()"
      );
    }
    const option = this.createOption(flags, description);
    option.makeOptionMandatory(!!config.mandatory);
    if (typeof fn === "function") {
      option.default(defaultValue).argParser(fn);
    } else if (fn instanceof RegExp) {
      const regex = fn;
      fn = (val, def) => {
        const m = regex.exec(val);
        return m ? m[0] : def;
      };
      option.default(defaultValue).argParser(fn);
    } else {
      option.default(fn);
    }
    return this.addOption(option);
  }
  /**
   * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
   *
   * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
   * option-argument is indicated by `<>` and an optional option-argument by `[]`.
   *
   * See the README for more details, and see also addOption() and requiredOption().
   *
   * @example
   * program
   *     .option('-p, --pepper', 'add pepper')
   *     .option('--pt, --pizza-type <TYPE>', 'type of pizza') // required option-argument
   *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
   *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
   *
   * @param {string} flags
   * @param {string} [description]
   * @param {(Function|*)} [parseArg] - custom option processing function or default value
   * @param {*} [defaultValue]
   * @return {Command} `this` command for chaining
   */
  option(flags, description, parseArg, defaultValue) {
    return this._optionEx({}, flags, description, parseArg, defaultValue);
  }
  /**
   * Add a required option which must have a value after parsing. This usually means
   * the option must be specified on the command line. (Otherwise the same as .option().)
   *
   * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
   *
   * @param {string} flags
   * @param {string} [description]
   * @param {(Function|*)} [parseArg] - custom option processing function or default value
   * @param {*} [defaultValue]
   * @return {Command} `this` command for chaining
   */
  requiredOption(flags, description, parseArg, defaultValue) {
    return this._optionEx(
      { mandatory: true },
      flags,
      description,
      parseArg,
      defaultValue
    );
  }
  /**
   * Alter parsing of short flags with optional values.
   *
   * @example
   * // for `.option('-f,--flag [value]'):
   * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
   * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
   *
   * @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
   * @return {Command} `this` command for chaining
   */
  combineFlagAndOptionalValue(combine = true) {
    this._combineFlagAndOptionalValue = !!combine;
    return this;
  }
  /**
   * Allow unknown options on the command line.
   *
   * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
   * @return {Command} `this` command for chaining
   */
  allowUnknownOption(allowUnknown = true) {
    this._allowUnknownOption = !!allowUnknown;
    return this;
  }
  /**
   * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
   *
   * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
   * @return {Command} `this` command for chaining
   */
  allowExcessArguments(allowExcess = true) {
    this._allowExcessArguments = !!allowExcess;
    return this;
  }
  /**
   * Enable positional options. Positional means global options are specified before subcommands which lets
   * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
   * The default behaviour is non-positional and global options may appear anywhere on the command line.
   *
   * @param {boolean} [positional]
   * @return {Command} `this` command for chaining
   */
  enablePositionalOptions(positional = true) {
    this._enablePositionalOptions = !!positional;
    return this;
  }
  /**
   * Pass through options that come after command-arguments rather than treat them as command-options,
   * so actual command-options come before command-arguments. Turning this on for a subcommand requires
   * positional options to have been enabled on the program (parent commands).
   * The default behaviour is non-positional and options may appear before or after command-arguments.
   *
   * @param {boolean} [passThrough] for unknown options.
   * @return {Command} `this` command for chaining
   */
  passThroughOptions(passThrough = true) {
    this._passThroughOptions = !!passThrough;
    this._checkForBrokenPassThrough();
    return this;
  }
  /**
   * @private
   */
  _checkForBrokenPassThrough() {
    if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
      throw new Error(
        `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`
      );
    }
  }
  /**
   * Whether to store option values as properties on command object,
   * or store separately (specify false). In both cases the option values can be accessed using .opts().
   *
   * @param {boolean} [storeAsProperties=true]
   * @return {Command} `this` command for chaining
   */
  storeOptionsAsProperties(storeAsProperties = true) {
    if (this.options.length) {
      throw new Error("call .storeOptionsAsProperties() before adding options");
    }
    if (Object.keys(this._optionValues).length) {
      throw new Error(
        "call .storeOptionsAsProperties() before setting option values"
      );
    }
    this._storeOptionsAsProperties = !!storeAsProperties;
    return this;
  }
  /**
   * Retrieve option value.
   *
   * @param {string} key
   * @return {object} value
   */
  getOptionValue(key) {
    if (this._storeOptionsAsProperties) {
      return this[key];
    }
    return this._optionValues[key];
  }
  /**
   * Store option value.
   *
   * @param {string} key
   * @param {object} value
   * @return {Command} `this` command for chaining
   */
  setOptionValue(key, value) {
    return this.setOptionValueWithSource(key, value, void 0);
  }
  /**
   * Store option value and where the value came from.
   *
   * @param {string} key
   * @param {object} value
   * @param {string} source - expected values are default/config/env/cli/implied
   * @return {Command} `this` command for chaining
   */
  setOptionValueWithSource(key, value, source) {
    if (this._storeOptionsAsProperties) {
      this[key] = value;
    } else {
      this._optionValues[key] = value;
    }
    this._optionValueSources[key] = source;
    return this;
  }
  /**
   * Get source of option value.
   * Expected values are default | config | env | cli | implied
   *
   * @param {string} key
   * @return {string}
   */
  getOptionValueSource(key) {
    return this._optionValueSources[key];
  }
  /**
   * Get source of option value. See also .optsWithGlobals().
   * Expected values are default | config | env | cli | implied
   *
   * @param {string} key
   * @return {string}
   */
  getOptionValueSourceWithGlobals(key) {
    let source;
    this._getCommandAndAncestors().forEach((cmd) => {
      if (cmd.getOptionValueSource(key) !== void 0) {
        source = cmd.getOptionValueSource(key);
      }
    });
    return source;
  }
  /**
   * Get user arguments from implied or explicit arguments.
   * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
   *
   * @private
   */
  _prepareUserArgs(argv, parseOptions) {
    if (argv !== void 0 && !Array.isArray(argv)) {
      throw new Error("first parameter to parse must be array or undefined");
    }
    parseOptions = parseOptions || {};
    if (argv === void 0 && parseOptions.from === void 0) {
      if (import_node_process.default.versions?.electron) {
        parseOptions.from = "electron";
      }
      const execArgv = import_node_process.default.execArgv ?? [];
      if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
        parseOptions.from = "eval";
      }
    }
    if (argv === void 0) {
      argv = import_node_process.default.argv;
    }
    this.rawArgs = argv.slice();
    let userArgs;
    switch (parseOptions.from) {
      case void 0:
      case "node":
        this._scriptPath = argv[1];
        userArgs = argv.slice(2);
        break;
      case "electron":
        if (import_node_process.default.defaultApp) {
          this._scriptPath = argv[1];
          userArgs = argv.slice(2);
        } else {
          userArgs = argv.slice(1);
        }
        break;
      case "user":
        userArgs = argv.slice(0);
        break;
      case "eval":
        userArgs = argv.slice(1);
        break;
      default:
        throw new Error(
          `unexpected parse option { from: '${parseOptions.from}' }`
        );
    }
    if (!this._name && this._scriptPath)
      this.nameFromFilename(this._scriptPath);
    this._name = this._name || "program";
    return userArgs;
  }
  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * Use parseAsync instead of parse if any of your action handlers are async.
   *
   * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
   *
   * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
   * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
   * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
   * - `'user'`: just user arguments
   *
   * @example
   * program.parse(); // parse process.argv and auto-detect electron and special node flags
   * program.parse(process.argv); // assume argv[0] is app and argv[1] is script
   * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   *
   * @param {string[]} [argv] - optional, defaults to process.argv
   * @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
   * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
   * @return {Command} `this` command for chaining
   */
  parse(argv, parseOptions) {
    this._prepareForParse();
    const userArgs = this._prepareUserArgs(argv, parseOptions);
    this._parseCommand([], userArgs);
    return this;
  }
  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
   *
   * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
   * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
   * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
   * - `'user'`: just user arguments
   *
   * @example
   * await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
   * await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
   * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   *
   * @param {string[]} [argv]
   * @param {object} [parseOptions]
   * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
   * @return {Promise}
   */
  async parseAsync(argv, parseOptions) {
    this._prepareForParse();
    const userArgs = this._prepareUserArgs(argv, parseOptions);
    await this._parseCommand([], userArgs);
    return this;
  }
  _prepareForParse() {
    if (this._savedState === null) {
      this.options.filter(
        (option) => option.negate && option.defaultValue === void 0 && this.getOptionValue(option.attributeName()) === void 0
      ).forEach((option) => {
        const positiveLongFlag = option.long.replace(/^--no-/, "--");
        if (!this._findOption(positiveLongFlag)) {
          this.setOptionValueWithSource(
            option.attributeName(),
            true,
            "default"
          );
        }
      });
      this.saveStateBeforeParse();
    } else {
      this.restoreStateBeforeParse();
    }
  }
  /**
   * Called the first time parse is called to save state and allow a restore before subsequent calls to parse.
   * Not usually called directly, but available for subclasses to save their custom state.
   *
   * This is called in a lazy way. Only commands used in parsing chain will have state saved.
   */
  saveStateBeforeParse() {
    this._savedState = {
      // name is stable if supplied by author, but may be unspecified for root command and deduced during parsing
      _name: this._name,
      // option values before parse have default values (including false for negated options)
      // shallow clones
      _optionValues: { ...this._optionValues },
      _optionValueSources: { ...this._optionValueSources }
    };
  }
  /**
   * Restore state before parse for calls after the first.
   * Not usually called directly, but available for subclasses to save their custom state.
   *
   * This is called in a lazy way. Only commands used in parsing chain will have state restored.
   */
  restoreStateBeforeParse() {
    if (this._storeOptionsAsProperties)
      throw new Error(`Can not call parse again when storeOptionsAsProperties is true.
- either make a new Command for each call to parse, or stop storing options as properties`);
    this._name = this._savedState._name;
    this._scriptPath = null;
    this.rawArgs = [];
    this._optionValues = { ...this._savedState._optionValues };
    this._optionValueSources = { ...this._savedState._optionValueSources };
    this.args = [];
    this.processedArgs = [];
  }
  /**
   * Throw if expected executable is missing. Add lots of help for author.
   *
   * @param {string} executableFile
   * @param {string} executableDir
   * @param {string} subcommandName
   */
  _checkForMissingExecutable(executableFile, executableDir, subcommandName) {
    if (import_node_fs.default.existsSync(executableFile)) return;
    const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
    const executableMissing = `'${executableFile}' does not exist
 - if '${subcommandName}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
    throw new Error(executableMissing);
  }
  /**
   * Execute a sub-command executable.
   *
   * @private
   */
  _executeSubCommand(subcommand, args) {
    args = args.slice();
    const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
    function findFile(baseDir, baseName) {
      const localBin = import_node_path.default.resolve(baseDir, baseName);
      if (import_node_fs.default.existsSync(localBin)) return localBin;
      if (sourceExt.includes(import_node_path.default.extname(baseName))) return void 0;
      const foundExt = sourceExt.find(
        (ext) => import_node_fs.default.existsSync(`${localBin}${ext}`)
      );
      if (foundExt) return `${localBin}${foundExt}`;
      return void 0;
    }
    this._checkForMissingMandatoryOptions();
    this._checkForConflictingOptions();
    let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
    let executableDir = this._executableDir || "";
    if (this._scriptPath) {
      let resolvedScriptPath;
      try {
        resolvedScriptPath = import_node_fs.default.realpathSync(this._scriptPath);
      } catch {
        resolvedScriptPath = this._scriptPath;
      }
      executableDir = import_node_path.default.resolve(
        import_node_path.default.dirname(resolvedScriptPath),
        executableDir
      );
    }
    if (executableDir) {
      let localFile = findFile(executableDir, executableFile);
      if (!localFile && !subcommand._executableFile && this._scriptPath) {
        const legacyName = import_node_path.default.basename(
          this._scriptPath,
          import_node_path.default.extname(this._scriptPath)
        );
        if (legacyName !== this._name) {
          localFile = findFile(
            executableDir,
            `${legacyName}-${subcommand._name}`
          );
        }
      }
      executableFile = localFile || executableFile;
    }
    const launchWithNode = sourceExt.includes(import_node_path.default.extname(executableFile));
    let proc;
    if (import_node_process.default.platform !== "win32") {
      if (launchWithNode) {
        args.unshift(executableFile);
        args = incrementNodeInspectorPort(import_node_process.default.execArgv).concat(args);
        proc = import_node_child_process.default.spawn(import_node_process.default.argv[0], args, { stdio: "inherit" });
      } else {
        proc = import_node_child_process.default.spawn(executableFile, args, { stdio: "inherit" });
      }
    } else {
      this._checkForMissingExecutable(
        executableFile,
        executableDir,
        subcommand._name
      );
      args.unshift(executableFile);
      args = incrementNodeInspectorPort(import_node_process.default.execArgv).concat(args);
      proc = import_node_child_process.default.spawn(import_node_process.default.execPath, args, { stdio: "inherit" });
    }
    if (!proc.killed) {
      const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
      signals.forEach((signal) => {
        import_node_process.default.on(signal, () => {
          if (proc.killed === false && proc.exitCode === null) {
            proc.kill(signal);
          }
        });
      });
    }
    const exitCallback = this._exitCallback;
    proc.on("close", (code) => {
      code = code ?? 1;
      if (!exitCallback) {
        import_node_process.default.exit(code);
      } else {
        exitCallback(
          new CommanderError(
            code,
            "commander.executeSubCommandAsync",
            "(close)"
          )
        );
      }
    });
    proc.on("error", (err) => {
      if (err.code === "ENOENT") {
        this._checkForMissingExecutable(
          executableFile,
          executableDir,
          subcommand._name
        );
      } else if (err.code === "EACCES") {
        throw new Error(`'${executableFile}' not executable`);
      }
      if (!exitCallback) {
        import_node_process.default.exit(1);
      } else {
        const wrappedError = new CommanderError(
          1,
          "commander.executeSubCommandAsync",
          "(error)"
        );
        wrappedError.nestedError = err;
        exitCallback(wrappedError);
      }
    });
    this.runningCommand = proc;
  }
  /**
   * @private
   */
  _dispatchSubcommand(commandName, operands, unknown) {
    const subCommand = this._findCommand(commandName);
    if (!subCommand) this.help({ error: true });
    subCommand._prepareForParse();
    let promiseChain;
    promiseChain = this._chainOrCallSubCommandHook(
      promiseChain,
      subCommand,
      "preSubcommand"
    );
    promiseChain = this._chainOrCall(promiseChain, () => {
      if (subCommand._executableHandler) {
        this._executeSubCommand(subCommand, operands.concat(unknown));
      } else {
        return subCommand._parseCommand(operands, unknown);
      }
    });
    return promiseChain;
  }
  /**
   * Invoke help directly if possible, or dispatch if necessary.
   * e.g. help foo
   *
   * @private
   */
  _dispatchHelpCommand(subcommandName) {
    if (!subcommandName) {
      this.help();
    }
    const subCommand = this._findCommand(subcommandName);
    if (subCommand && !subCommand._executableHandler) {
      subCommand.help();
    }
    return this._dispatchSubcommand(
      subcommandName,
      [],
      [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]
    );
  }
  /**
   * Check this.args against expected this.registeredArguments.
   *
   * @private
   */
  _checkNumberOfArguments() {
    this.registeredArguments.forEach((arg, i) => {
      if (arg.required && this.args[i] == null) {
        this.missingArgument(arg.name());
      }
    });
    if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
      return;
    }
    if (this.args.length > this.registeredArguments.length) {
      this._excessArguments(this.args);
    }
  }
  /**
   * Process this.args using this.registeredArguments and save as this.processedArgs!
   *
   * @private
   */
  _processArguments() {
    const myParseArg = (argument, value, previous) => {
      let parsedValue = value;
      if (value !== null && argument.parseArg) {
        const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
        parsedValue = this._callParseArg(
          argument,
          value,
          previous,
          invalidValueMessage
        );
      }
      return parsedValue;
    };
    this._checkNumberOfArguments();
    const processedArgs = [];
    this.registeredArguments.forEach((declaredArg, index) => {
      let value = declaredArg.defaultValue;
      if (declaredArg.variadic) {
        if (index < this.args.length) {
          value = this.args.slice(index);
          if (declaredArg.parseArg) {
            value = value.reduce((processed, v) => {
              return myParseArg(declaredArg, v, processed);
            }, declaredArg.defaultValue);
          }
        } else if (value === void 0) {
          value = [];
        }
      } else if (index < this.args.length) {
        value = this.args[index];
        if (declaredArg.parseArg) {
          value = myParseArg(declaredArg, value, declaredArg.defaultValue);
        }
      }
      processedArgs[index] = value;
    });
    this.processedArgs = processedArgs;
  }
  /**
   * Once we have a promise we chain, but call synchronously until then.
   *
   * @param {(Promise|undefined)} promise
   * @param {Function} fn
   * @return {(Promise|undefined)}
   * @private
   */
  _chainOrCall(promise, fn) {
    if (promise?.then && typeof promise.then === "function") {
      return promise.then(() => fn());
    }
    return fn();
  }
  /**
   *
   * @param {(Promise|undefined)} promise
   * @param {string} event
   * @return {(Promise|undefined)}
   * @private
   */
  _chainOrCallHooks(promise, event) {
    let result = promise;
    const hooks = [];
    this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
      hookedCommand._lifeCycleHooks[event].forEach((callback) => {
        hooks.push({ hookedCommand, callback });
      });
    });
    if (event === "postAction") {
      hooks.reverse();
    }
    hooks.forEach((hookDetail) => {
      result = this._chainOrCall(result, () => {
        return hookDetail.callback(hookDetail.hookedCommand, this);
      });
    });
    return result;
  }
  /**
   *
   * @param {(Promise|undefined)} promise
   * @param {Command} subCommand
   * @param {string} event
   * @return {(Promise|undefined)}
   * @private
   */
  _chainOrCallSubCommandHook(promise, subCommand, event) {
    let result = promise;
    if (this._lifeCycleHooks[event] !== void 0) {
      this._lifeCycleHooks[event].forEach((hook) => {
        result = this._chainOrCall(result, () => {
          return hook(this, subCommand);
        });
      });
    }
    return result;
  }
  /**
   * Process arguments in context of this command.
   * Returns action result, in case it is a promise.
   *
   * @private
   */
  _parseCommand(operands, unknown) {
    const parsed = this.parseOptions(unknown);
    this._parseOptionsEnv();
    this._parseOptionsImplied();
    operands = operands.concat(parsed.operands);
    unknown = parsed.unknown;
    this.args = operands.concat(unknown);
    if (operands && this._findCommand(operands[0])) {
      return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
    }
    if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
      return this._dispatchHelpCommand(operands[1]);
    }
    if (this._defaultCommandName) {
      this._outputHelpIfRequested(unknown);
      return this._dispatchSubcommand(
        this._defaultCommandName,
        operands,
        unknown
      );
    }
    if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
      this.help({ error: true });
    }
    this._outputHelpIfRequested(parsed.unknown);
    this._checkForMissingMandatoryOptions();
    this._checkForConflictingOptions();
    const checkForUnknownOptions = () => {
      if (parsed.unknown.length > 0) {
        this.unknownOption(parsed.unknown[0]);
      }
    };
    const commandEvent = `command:${this.name()}`;
    if (this._actionHandler) {
      checkForUnknownOptions();
      this._processArguments();
      let promiseChain;
      promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
      promiseChain = this._chainOrCall(
        promiseChain,
        () => this._actionHandler(this.processedArgs)
      );
      if (this.parent) {
        promiseChain = this._chainOrCall(promiseChain, () => {
          this.parent.emit(commandEvent, operands, unknown);
        });
      }
      promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
      return promiseChain;
    }
    if (this.parent?.listenerCount(commandEvent)) {
      checkForUnknownOptions();
      this._processArguments();
      this.parent.emit(commandEvent, operands, unknown);
    } else if (operands.length) {
      if (this._findCommand("*")) {
        return this._dispatchSubcommand("*", operands, unknown);
      }
      if (this.listenerCount("command:*")) {
        this.emit("command:*", operands, unknown);
      } else if (this.commands.length) {
        this.unknownCommand();
      } else {
        checkForUnknownOptions();
        this._processArguments();
      }
    } else if (this.commands.length) {
      checkForUnknownOptions();
      this.help({ error: true });
    } else {
      checkForUnknownOptions();
      this._processArguments();
    }
  }
  /**
   * Find matching command.
   *
   * @private
   * @return {Command | undefined}
   */
  _findCommand(name) {
    if (!name) return void 0;
    return this.commands.find(
      (cmd) => cmd._name === name || cmd._aliases.includes(name)
    );
  }
  /**
   * Return an option matching `arg` if any.
   *
   * @param {string} arg
   * @return {Option}
   * @package
   */
  _findOption(arg) {
    return this.options.find((option) => option.is(arg));
  }
  /**
   * Display an error message if a mandatory option does not have a value.
   * Called after checking for help flags in leaf subcommand.
   *
   * @private
   */
  _checkForMissingMandatoryOptions() {
    this._getCommandAndAncestors().forEach((cmd) => {
      cmd.options.forEach((anOption) => {
        if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0) {
          cmd.missingMandatoryOptionValue(anOption);
        }
      });
    });
  }
  /**
   * Display an error message if conflicting options are used together in this.
   *
   * @private
   */
  _checkForConflictingLocalOptions() {
    const definedNonDefaultOptions = this.options.filter((option) => {
      const optionKey = option.attributeName();
      if (this.getOptionValue(optionKey) === void 0) {
        return false;
      }
      return this.getOptionValueSource(optionKey) !== "default";
    });
    const optionsWithConflicting = definedNonDefaultOptions.filter(
      (option) => option.conflictsWith.length > 0
    );
    optionsWithConflicting.forEach((option) => {
      const conflictingAndDefined = definedNonDefaultOptions.find(
        (defined) => option.conflictsWith.includes(defined.attributeName())
      );
      if (conflictingAndDefined) {
        this._conflictingOption(option, conflictingAndDefined);
      }
    });
  }
  /**
   * Display an error message if conflicting options are used together.
   * Called after checking for help flags in leaf subcommand.
   *
   * @private
   */
  _checkForConflictingOptions() {
    this._getCommandAndAncestors().forEach((cmd) => {
      cmd._checkForConflictingLocalOptions();
    });
  }
  /**
   * Parse options from `argv` removing known options,
   * and return argv split into operands and unknown arguments.
   *
   * Side effects: modifies command by storing options. Does not reset state if called again.
   *
   * Examples:
   *
   *     argv => operands, unknown
   *     --known kkk op => [op], []
   *     op --known kkk => [op], []
   *     sub --unknown uuu op => [sub], [--unknown uuu op]
   *     sub -- --unknown uuu op => [sub --unknown uuu op], []
   *
   * @param {string[]} args
   * @return {{operands: string[], unknown: string[]}}
   */
  parseOptions(args) {
    const operands = [];
    const unknown = [];
    let dest = operands;
    function maybeOption(arg) {
      return arg.length > 1 && arg[0] === "-";
    }
    const negativeNumberArg = (arg) => {
      if (!/^-(\d+|\d*\.\d+)(e[+-]?\d+)?$/.test(arg)) return false;
      return !this._getCommandAndAncestors().some(
        (cmd) => cmd.options.map((opt) => opt.short).some((short) => /^-\d$/.test(short))
      );
    };
    let activeVariadicOption = null;
    let activeGroup = null;
    let i = 0;
    while (i < args.length || activeGroup) {
      const arg = activeGroup ?? args[i++];
      activeGroup = null;
      if (arg === "--") {
        if (dest === unknown) dest.push(arg);
        dest.push(...args.slice(i));
        break;
      }
      if (activeVariadicOption && (!maybeOption(arg) || negativeNumberArg(arg))) {
        this.emit(`option:${activeVariadicOption.name()}`, arg);
        continue;
      }
      activeVariadicOption = null;
      if (maybeOption(arg)) {
        const option = this._findOption(arg);
        if (option) {
          if (option.required) {
            const value = args[i++];
            if (value === void 0) this.optionMissingArgument(option);
            this.emit(`option:${option.name()}`, value);
          } else if (option.optional) {
            let value = null;
            if (i < args.length && (!maybeOption(args[i]) || negativeNumberArg(args[i]))) {
              value = args[i++];
            }
            this.emit(`option:${option.name()}`, value);
          } else {
            this.emit(`option:${option.name()}`);
          }
          activeVariadicOption = option.variadic ? option : null;
          continue;
        }
      }
      if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
        const option = this._findOption(`-${arg[1]}`);
        if (option) {
          if (option.required || option.optional && this._combineFlagAndOptionalValue) {
            this.emit(`option:${option.name()}`, arg.slice(2));
          } else {
            this.emit(`option:${option.name()}`);
            activeGroup = `-${arg.slice(2)}`;
          }
          continue;
        }
      }
      if (/^--[^=]+=/.test(arg)) {
        const index = arg.indexOf("=");
        const option = this._findOption(arg.slice(0, index));
        if (option && (option.required || option.optional)) {
          this.emit(`option:${option.name()}`, arg.slice(index + 1));
          continue;
        }
      }
      if (dest === operands && maybeOption(arg) && !(this.commands.length === 0 && negativeNumberArg(arg))) {
        dest = unknown;
      }
      if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
        if (this._findCommand(arg)) {
          operands.push(arg);
          unknown.push(...args.slice(i));
          break;
        } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
          operands.push(arg, ...args.slice(i));
          break;
        } else if (this._defaultCommandName) {
          unknown.push(arg, ...args.slice(i));
          break;
        }
      }
      if (this._passThroughOptions) {
        dest.push(arg, ...args.slice(i));
        break;
      }
      dest.push(arg);
    }
    return { operands, unknown };
  }
  /**
   * Return an object containing local option values as key-value pairs.
   *
   * @return {object}
   */
  opts() {
    if (this._storeOptionsAsProperties) {
      const result = {};
      const len = this.options.length;
      for (let i = 0; i < len; i++) {
        const key = this.options[i].attributeName();
        result[key] = key === this._versionOptionName ? this._version : this[key];
      }
      return result;
    }
    return this._optionValues;
  }
  /**
   * Return an object containing merged local and global option values as key-value pairs.
   *
   * @return {object}
   */
  optsWithGlobals() {
    return this._getCommandAndAncestors().reduce(
      (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
      {}
    );
  }
  /**
   * Display error message and exit (or call exitOverride).
   *
   * @param {string} message
   * @param {object} [errorOptions]
   * @param {string} [errorOptions.code] - an id string representing the error
   * @param {number} [errorOptions.exitCode] - used with process.exit
   */
  error(message, errorOptions) {
    this._outputConfiguration.outputError(
      `${message}
`,
      this._outputConfiguration.writeErr
    );
    if (typeof this._showHelpAfterError === "string") {
      this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
    } else if (this._showHelpAfterError) {
      this._outputConfiguration.writeErr("\n");
      this.outputHelp({ error: true });
    }
    const config = errorOptions || {};
    const exitCode = config.exitCode || 1;
    const code = config.code || "commander.error";
    this._exit(exitCode, code, message);
  }
  /**
   * Apply any option related environment variables, if option does
   * not have a value from cli or client code.
   *
   * @private
   */
  _parseOptionsEnv() {
    this.options.forEach((option) => {
      if (option.envVar && option.envVar in import_node_process.default.env) {
        const optionKey = option.attributeName();
        if (this.getOptionValue(optionKey) === void 0 || ["default", "config", "env"].includes(
          this.getOptionValueSource(optionKey)
        )) {
          if (option.required || option.optional) {
            this.emit(`optionEnv:${option.name()}`, import_node_process.default.env[option.envVar]);
          } else {
            this.emit(`optionEnv:${option.name()}`);
          }
        }
      }
    });
  }
  /**
   * Apply any implied option values, if option is undefined or default value.
   *
   * @private
   */
  _parseOptionsImplied() {
    const dualHelper = new DualOptions(this.options);
    const hasCustomOptionValue = (optionKey) => {
      return this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
    };
    this.options.filter(
      (option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(
        this.getOptionValue(option.attributeName()),
        option
      )
    ).forEach((option) => {
      Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
        this.setOptionValueWithSource(
          impliedKey,
          option.implied[impliedKey],
          "implied"
        );
      });
    });
  }
  /**
   * Argument `name` is missing.
   *
   * @param {string} name
   * @private
   */
  missingArgument(name) {
    const message = `error: missing required argument '${name}'`;
    this.error(message, { code: "commander.missingArgument" });
  }
  /**
   * `Option` is missing an argument.
   *
   * @param {Option} option
   * @private
   */
  optionMissingArgument(option) {
    const message = `error: option '${option.flags}' argument missing`;
    this.error(message, { code: "commander.optionMissingArgument" });
  }
  /**
   * `Option` does not have a value, and is a mandatory option.
   *
   * @param {Option} option
   * @private
   */
  missingMandatoryOptionValue(option) {
    const message = `error: required option '${option.flags}' not specified`;
    this.error(message, { code: "commander.missingMandatoryOptionValue" });
  }
  /**
   * `Option` conflicts with another option.
   *
   * @param {Option} option
   * @param {Option} conflictingOption
   * @private
   */
  _conflictingOption(option, conflictingOption) {
    const findBestOptionFromValue = (option2) => {
      const optionKey = option2.attributeName();
      const optionValue = this.getOptionValue(optionKey);
      const negativeOption = this.options.find(
        (target) => target.negate && optionKey === target.attributeName()
      );
      const positiveOption = this.options.find(
        (target) => !target.negate && optionKey === target.attributeName()
      );
      if (negativeOption && (negativeOption.presetArg === void 0 && optionValue === false || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg)) {
        return negativeOption;
      }
      return positiveOption || option2;
    };
    const getErrorMessage = (option2) => {
      const bestOption = findBestOptionFromValue(option2);
      const optionKey = bestOption.attributeName();
      const source = this.getOptionValueSource(optionKey);
      if (source === "env") {
        return `environment variable '${bestOption.envVar}'`;
      }
      return `option '${bestOption.flags}'`;
    };
    const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
    this.error(message, { code: "commander.conflictingOption" });
  }
  /**
   * Unknown option `flag`.
   *
   * @param {string} flag
   * @private
   */
  unknownOption(flag) {
    if (this._allowUnknownOption) return;
    let suggestion = "";
    if (flag.startsWith("--") && this._showSuggestionAfterError) {
      let candidateFlags = [];
      let command = this;
      do {
        const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
        candidateFlags = candidateFlags.concat(moreFlags);
        command = command.parent;
      } while (command && !command._enablePositionalOptions);
      suggestion = suggestSimilar(flag, candidateFlags);
    }
    const message = `error: unknown option '${flag}'${suggestion}`;
    this.error(message, { code: "commander.unknownOption" });
  }
  /**
   * Excess arguments, more than expected.
   *
   * @param {string[]} receivedArgs
   * @private
   */
  _excessArguments(receivedArgs) {
    if (this._allowExcessArguments) return;
    const expected = this.registeredArguments.length;
    const s = expected === 1 ? "" : "s";
    const received = receivedArgs.length;
    const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
    const details = receivedArgs.join(", ");
    const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${received}: ${details}.`;
    this.error(message, { code: "commander.excessArguments" });
  }
  /**
   * Unknown command.
   *
   * @private
   */
  unknownCommand() {
    const unknownName = this.args[0];
    let suggestion = "";
    if (this._showSuggestionAfterError) {
      const candidateNames = [];
      this.createHelp().visibleCommands(this).forEach((command) => {
        candidateNames.push(command.name());
        if (command.alias()) candidateNames.push(command.alias());
      });
      suggestion = suggestSimilar(unknownName, candidateNames);
    }
    const message = `error: unknown command '${unknownName}'${suggestion}`;
    this.error(message, { code: "commander.unknownCommand" });
  }
  /**
   * Get or set the program version.
   *
   * This method auto-registers the "-V, --version" option which will print the version number.
   *
   * You can optionally supply the flags and description to override the defaults.
   *
   * @param {string} [str]
   * @param {string} [flags]
   * @param {string} [description]
   * @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
   */
  version(str, flags, description) {
    if (str === void 0) return this._version;
    this._version = str;
    flags = flags || "-V, --version";
    description = description || "output the version number";
    const versionOption = this.createOption(flags, description);
    this._versionOptionName = versionOption.attributeName();
    this._registerOption(versionOption);
    this.on("option:" + versionOption.name(), () => {
      this._outputConfiguration.writeOut(`${str}
`);
      this._exit(0, "commander.version", str);
    });
    return this;
  }
  /**
   * Set the description.
   *
   * @param {string} [str]
   * @param {object} [argsDescription]
   * @return {(string|Command)}
   */
  description(str, argsDescription) {
    if (str === void 0 && argsDescription === void 0)
      return this._description;
    this._description = str;
    if (argsDescription) {
      this._argsDescription = argsDescription;
    }
    return this;
  }
  /**
   * Set the summary. Used when listed as subcommand of parent.
   *
   * @param {string} [str]
   * @return {(string|Command)}
   */
  summary(str) {
    if (str === void 0) return this._summary;
    this._summary = str;
    return this;
  }
  /**
   * Set an alias for the command.
   *
   * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
   *
   * @param {string} [alias]
   * @return {(string|Command)}
   */
  alias(alias) {
    if (alias === void 0) return this._aliases[0];
    let command = this;
    if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
      command = this.commands[this.commands.length - 1];
    }
    if (alias === command._name)
      throw new Error("Command alias can't be the same as its name");
    const matchingCommand = this.parent?._findCommand(alias);
    if (matchingCommand) {
      const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
      throw new Error(
        `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`
      );
    }
    command._aliases.push(alias);
    return this;
  }
  /**
   * Set aliases for the command.
   *
   * Only the first alias is shown in the auto-generated help.
   *
   * @param {string[]} [aliases]
   * @return {(string[]|Command)}
   */
  aliases(aliases) {
    if (aliases === void 0) return this._aliases;
    aliases.forEach((alias) => this.alias(alias));
    return this;
  }
  /**
   * Set / get the command usage `str`.
   *
   * @param {string} [str]
   * @return {(string|Command)}
   */
  usage(str) {
    if (str === void 0) {
      if (this._usage) return this._usage;
      const args = this.registeredArguments.map((arg) => {
        return humanReadableArgName(arg);
      });
      return [].concat(
        this.options.length || this._helpOption !== null ? "[options]" : [],
        this.commands.length ? "[command]" : [],
        this.registeredArguments.length ? args : []
      ).join(" ");
    }
    this._usage = str;
    return this;
  }
  /**
   * Get or set the name of the command.
   *
   * @param {string} [str]
   * @return {(string|Command)}
   */
  name(str) {
    if (str === void 0) return this._name;
    this._name = str;
    return this;
  }
  /**
   * Set/get the help group heading for this subcommand in parent command's help.
   *
   * @param {string} [heading]
   * @return {Command | string}
   */
  helpGroup(heading) {
    if (heading === void 0) return this._helpGroupHeading ?? "";
    this._helpGroupHeading = heading;
    return this;
  }
  /**
   * Set/get the default help group heading for subcommands added to this command.
   * (This does not override a group set directly on the subcommand using .helpGroup().)
   *
   * @example
   * program.commandsGroup('Development Commands:);
   * program.command('watch')...
   * program.command('lint')...
   * ...
   *
   * @param {string} [heading]
   * @returns {Command | string}
   */
  commandsGroup(heading) {
    if (heading === void 0) return this._defaultCommandGroup ?? "";
    this._defaultCommandGroup = heading;
    return this;
  }
  /**
   * Set/get the default help group heading for options added to this command.
   * (This does not override a group set directly on the option using .helpGroup().)
   *
   * @example
   * program
   *   .optionsGroup('Development Options:')
   *   .option('-d, --debug', 'output extra debugging')
   *   .option('-p, --profile', 'output profiling information')
   *
   * @param {string} [heading]
   * @returns {Command | string}
   */
  optionsGroup(heading) {
    if (heading === void 0) return this._defaultOptionGroup ?? "";
    this._defaultOptionGroup = heading;
    return this;
  }
  /**
   * @param {Option} option
   * @private
   */
  _initOptionGroup(option) {
    if (this._defaultOptionGroup && !option.helpGroupHeading)
      option.helpGroup(this._defaultOptionGroup);
  }
  /**
   * @param {Command} cmd
   * @private
   */
  _initCommandGroup(cmd) {
    if (this._defaultCommandGroup && !cmd.helpGroup())
      cmd.helpGroup(this._defaultCommandGroup);
  }
  /**
   * Set the name of the command from script filename, such as process.argv[1],
   * or import.meta.filename.
   *
   * (Used internally and public although not documented in README.)
   *
   * @example
   * program.nameFromFilename(import.meta.filename);
   *
   * @param {string} filename
   * @return {Command}
   */
  nameFromFilename(filename) {
    this._name = import_node_path.default.basename(filename, import_node_path.default.extname(filename));
    return this;
  }
  /**
   * Get or set the directory for searching for executable subcommands of this command.
   *
   * @example
   * program.executableDir(import.meta.dirname);
   * // or
   * program.executableDir('subcommands');
   *
   * @param {string} [path]
   * @return {(string|null|Command)}
   */
  executableDir(path2) {
    if (path2 === void 0) return this._executableDir;
    this._executableDir = path2;
    return this;
  }
  /**
   * Return program help documentation.
   *
   * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
   * @return {string}
   */
  helpInformation(contextOptions) {
    const helper = this.createHelp();
    const context = this._getOutputContext(contextOptions);
    helper.prepareContext({
      error: context.error,
      helpWidth: context.helpWidth,
      outputHasColors: context.hasColors
    });
    const text = helper.formatHelp(this, helper);
    if (context.hasColors) return text;
    return this._outputConfiguration.stripColor(text);
  }
  /**
   * @typedef HelpContext
   * @type {object}
   * @property {boolean} error
   * @property {number} helpWidth
   * @property {boolean} hasColors
   * @property {function} write - includes stripColor if needed
   *
   * @returns {HelpContext}
   * @private
   */
  _getOutputContext(contextOptions) {
    contextOptions = contextOptions || {};
    const error = !!contextOptions.error;
    let baseWrite;
    let hasColors;
    let helpWidth;
    if (error) {
      baseWrite = (str) => this._outputConfiguration.writeErr(str);
      hasColors = this._outputConfiguration.getErrHasColors();
      helpWidth = this._outputConfiguration.getErrHelpWidth();
    } else {
      baseWrite = (str) => this._outputConfiguration.writeOut(str);
      hasColors = this._outputConfiguration.getOutHasColors();
      helpWidth = this._outputConfiguration.getOutHelpWidth();
    }
    const write = (str) => {
      if (!hasColors) str = this._outputConfiguration.stripColor(str);
      return baseWrite(str);
    };
    return { error, write, hasColors, helpWidth };
  }
  /**
   * Output help information for this command.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   *
   * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
   */
  outputHelp(contextOptions) {
    let deprecatedCallback;
    if (typeof contextOptions === "function") {
      deprecatedCallback = contextOptions;
      contextOptions = void 0;
    }
    const outputContext = this._getOutputContext(contextOptions);
    const eventContext = {
      error: outputContext.error,
      write: outputContext.write,
      command: this
    };
    this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", eventContext));
    this.emit("beforeHelp", eventContext);
    let helpInformation = this.helpInformation({ error: outputContext.error });
    if (deprecatedCallback) {
      helpInformation = deprecatedCallback(helpInformation);
      if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
        throw new Error("outputHelp callback must return a string or a Buffer");
      }
    }
    outputContext.write(helpInformation);
    if (this._getHelpOption()?.long) {
      this.emit(this._getHelpOption().long);
    }
    this.emit("afterHelp", eventContext);
    this._getCommandAndAncestors().forEach(
      (command) => command.emit("afterAllHelp", eventContext)
    );
  }
  /**
   * You can pass in flags and a description to customise the built-in help option.
   * Pass in false to disable the built-in help option.
   *
   * @example
   * program.helpOption('-?, --help' 'show help'); // customise
   * program.helpOption(false); // disable
   *
   * @param {(string | boolean)} flags
   * @param {string} [description]
   * @return {Command} `this` command for chaining
   */
  helpOption(flags, description) {
    if (typeof flags === "boolean") {
      if (flags) {
        if (this._helpOption === null) this._helpOption = void 0;
        if (this._defaultOptionGroup) {
          this._initOptionGroup(this._getHelpOption());
        }
      } else {
        this._helpOption = null;
      }
      return this;
    }
    this._helpOption = this.createOption(
      flags ?? "-h, --help",
      description ?? "display help for command"
    );
    if (flags || description) this._initOptionGroup(this._helpOption);
    return this;
  }
  /**
   * Lazy create help option.
   * Returns null if has been disabled with .helpOption(false).
   *
   * @returns {(Option | null)} the help option
   * @package
   */
  _getHelpOption() {
    if (this._helpOption === void 0) {
      this.helpOption(void 0, void 0);
    }
    return this._helpOption;
  }
  /**
   * Supply your own option to use for the built-in help option.
   * This is an alternative to using helpOption() to customise the flags and description etc.
   *
   * @param {Option} option
   * @return {Command} `this` command for chaining
   */
  addHelpOption(option) {
    this._helpOption = option;
    this._initOptionGroup(option);
    return this;
  }
  /**
   * Output help information and exit.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   *
   * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
   */
  help(contextOptions) {
    this.outputHelp(contextOptions);
    let exitCode = Number(import_node_process.default.exitCode ?? 0);
    if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
      exitCode = 1;
    }
    this._exit(exitCode, "commander.help", "(outputHelp)");
  }
  /**
   * // Do a little typing to coordinate emit and listener for the help text events.
   * @typedef HelpTextEventContext
   * @type {object}
   * @property {boolean} error
   * @property {Command} command
   * @property {function} write
   */
  /**
   * Add additional text to be displayed with the built-in help.
   *
   * Position is 'before' or 'after' to affect just this command,
   * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
   *
   * @param {string} position - before or after built-in help
   * @param {(string | Function)} text - string to add, or a function returning a string
   * @return {Command} `this` command for chaining
   */
  addHelpText(position, text) {
    const allowedValues = ["beforeAll", "before", "after", "afterAll"];
    if (!allowedValues.includes(position)) {
      throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
    }
    const helpEvent = `${position}Help`;
    this.on(helpEvent, (context) => {
      let helpStr;
      if (typeof text === "function") {
        helpStr = text({ error: context.error, command: context.command });
      } else {
        helpStr = text;
      }
      if (helpStr) {
        context.write(`${helpStr}
`);
      }
    });
    return this;
  }
  /**
   * Output help information if help flags specified
   *
   * @param {Array} args - array of options to search for help flags
   * @private
   */
  _outputHelpIfRequested(args) {
    const helpOption = this._getHelpOption();
    const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
    if (helpRequested) {
      this.outputHelp();
      this._exit(0, "commander.helpDisplayed", "(outputHelp)");
    }
  }
};
function incrementNodeInspectorPort(args) {
  return args.map((arg) => {
    if (!arg.startsWith("--inspect")) {
      return arg;
    }
    let debugOption;
    let debugHost = "127.0.0.1";
    let debugPort = "9229";
    let match;
    if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
      debugOption = match[1];
    } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
      debugOption = match[1];
      if (/^\d+$/.test(match[3])) {
        debugPort = match[3];
      } else {
        debugHost = match[3];
      }
    } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
      debugOption = match[1];
      debugHost = match[3];
      debugPort = match[4];
    }
    if (debugOption && debugPort !== "0") {
      return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
    }
    return arg;
  });
}
function useColor() {
  if (import_node_process.default.env.NO_COLOR || import_node_process.default.env.FORCE_COLOR === "0" || import_node_process.default.env.FORCE_COLOR === "false")
    return false;
  if (import_node_process.default.env.FORCE_COLOR || import_node_process.default.env.CLICOLOR_FORCE !== void 0)
    return true;
  return void 0;
}

// node_modules/.pnpm/commander@15.0.0/node_modules/commander/index.js
var program = new Command();

// packages/core/src/generated/bidi-ranges.ts
var RTL_BIDI_RANGES = [
  1424,
  1424,
  1470,
  1470,
  1472,
  1472,
  1475,
  1475,
  1478,
  1478,
  1480,
  1535,
  1544,
  1544,
  1547,
  1547,
  1549,
  1549,
  1563,
  1610,
  1645,
  1647,
  1649,
  1749,
  1765,
  1766,
  1774,
  1775,
  1786,
  1808,
  1810,
  1839,
  1867,
  1957,
  1969,
  2026,
  2036,
  2037,
  2042,
  2044,
  2046,
  2069,
  2074,
  2074,
  2084,
  2084,
  2088,
  2088,
  2094,
  2136,
  2140,
  2191,
  2194,
  2198,
  2208,
  2249,
  8207,
  8207,
  64285,
  64285,
  64287,
  64296,
  64298,
  64450,
  64467,
  64829,
  64848,
  64911,
  64914,
  64967,
  65008,
  65020,
  65136,
  65278,
  67584,
  67870,
  67872,
  68096,
  68100,
  68100,
  68103,
  68107,
  68112,
  68151,
  68155,
  68158,
  68160,
  68324,
  68327,
  68408,
  68416,
  68899,
  68904,
  68911,
  68922,
  68927,
  68938,
  68968,
  68975,
  69215,
  69247,
  69290,
  69293,
  69327,
  69337,
  69369,
  69376,
  69445,
  69457,
  69505,
  69510,
  69631,
  124928,
  125135,
  125143,
  125251,
  125259,
  126703,
  126706,
  126975
];
var NON_STRONG_BIDI_RANGES = [
  0,
  64,
  91,
  96,
  123,
  169,
  171,
  180,
  182,
  185,
  187,
  191,
  215,
  215,
  247,
  247,
  697,
  698,
  706,
  719,
  722,
  735,
  741,
  749,
  751,
  879,
  884,
  885,
  894,
  894,
  900,
  901,
  903,
  903,
  1014,
  1014,
  1155,
  1161,
  1418,
  1418,
  1421,
  1423,
  1425,
  1469,
  1471,
  1471,
  1473,
  1474,
  1476,
  1477,
  1479,
  1479,
  1536,
  1543,
  1545,
  1546,
  1548,
  1548,
  1550,
  1562,
  1611,
  1644,
  1648,
  1648,
  1750,
  1764,
  1767,
  1773,
  1776,
  1785,
  1809,
  1809,
  1840,
  1866,
  1958,
  1968,
  2027,
  2035,
  2038,
  2041,
  2045,
  2045,
  2070,
  2073,
  2075,
  2083,
  2085,
  2087,
  2089,
  2093,
  2137,
  2139,
  2192,
  2193,
  2199,
  2207,
  2250,
  2306,
  2362,
  2362,
  2364,
  2364,
  2369,
  2376,
  2381,
  2381,
  2385,
  2391,
  2402,
  2403,
  2433,
  2433,
  2492,
  2492,
  2497,
  2500,
  2509,
  2509,
  2530,
  2531,
  2546,
  2547,
  2555,
  2555,
  2558,
  2558,
  2561,
  2562,
  2620,
  2620,
  2625,
  2626,
  2631,
  2632,
  2635,
  2637,
  2641,
  2641,
  2672,
  2673,
  2677,
  2677,
  2689,
  2690,
  2748,
  2748,
  2753,
  2757,
  2759,
  2760,
  2765,
  2765,
  2786,
  2787,
  2801,
  2801,
  2810,
  2815,
  2817,
  2817,
  2876,
  2876,
  2879,
  2879,
  2881,
  2884,
  2893,
  2893,
  2901,
  2902,
  2914,
  2915,
  2946,
  2946,
  3008,
  3008,
  3021,
  3021,
  3059,
  3066,
  3072,
  3072,
  3076,
  3076,
  3132,
  3132,
  3134,
  3136,
  3142,
  3144,
  3146,
  3149,
  3157,
  3158,
  3170,
  3171,
  3192,
  3198,
  3201,
  3201,
  3260,
  3260,
  3276,
  3277,
  3298,
  3299,
  3328,
  3329,
  3387,
  3388,
  3393,
  3396,
  3405,
  3405,
  3426,
  3427,
  3457,
  3457,
  3530,
  3530,
  3538,
  3540,
  3542,
  3542,
  3633,
  3633,
  3636,
  3642,
  3647,
  3647,
  3655,
  3662,
  3761,
  3761,
  3764,
  3772,
  3784,
  3790,
  3864,
  3865,
  3893,
  3893,
  3895,
  3895,
  3897,
  3901,
  3953,
  3966,
  3968,
  3972,
  3974,
  3975,
  3981,
  3991,
  3993,
  4028,
  4038,
  4038,
  4141,
  4144,
  4146,
  4151,
  4153,
  4154,
  4157,
  4158,
  4184,
  4185,
  4190,
  4192,
  4209,
  4212,
  4226,
  4226,
  4229,
  4230,
  4237,
  4237,
  4253,
  4253,
  4957,
  4959,
  5008,
  5017,
  5120,
  5120,
  5760,
  5760,
  5787,
  5788,
  5906,
  5908,
  5938,
  5939,
  5970,
  5971,
  6002,
  6003,
  6068,
  6069,
  6071,
  6077,
  6086,
  6086,
  6089,
  6099,
  6107,
  6107,
  6109,
  6109,
  6128,
  6137,
  6144,
  6159,
  6277,
  6278,
  6313,
  6313,
  6432,
  6434,
  6439,
  6440,
  6450,
  6450,
  6457,
  6459,
  6464,
  6464,
  6468,
  6469,
  6622,
  6655,
  6679,
  6680,
  6683,
  6683,
  6742,
  6742,
  6744,
  6750,
  6752,
  6752,
  6754,
  6754,
  6757,
  6764,
  6771,
  6780,
  6783,
  6783,
  6832,
  6877,
  6880,
  6891,
  6912,
  6915,
  6964,
  6964,
  6966,
  6970,
  6972,
  6972,
  6978,
  6978,
  7019,
  7027,
  7040,
  7041,
  7074,
  7077,
  7080,
  7081,
  7083,
  7085,
  7142,
  7142,
  7144,
  7145,
  7149,
  7149,
  7151,
  7153,
  7212,
  7219,
  7222,
  7223,
  7376,
  7378,
  7380,
  7392,
  7394,
  7400,
  7405,
  7405,
  7412,
  7412,
  7416,
  7417,
  7616,
  7679,
  8125,
  8125,
  8127,
  8129,
  8141,
  8143,
  8157,
  8159,
  8173,
  8175,
  8189,
  8190,
  8192,
  8205,
  8208,
  8304,
  8308,
  8318,
  8320,
  8334,
  8352,
  8432,
  8448,
  8449,
  8451,
  8454,
  8456,
  8457,
  8468,
  8468,
  8470,
  8472,
  8478,
  8483,
  8485,
  8485,
  8487,
  8487,
  8489,
  8489,
  8494,
  8494,
  8506,
  8507,
  8512,
  8516,
  8522,
  8525,
  8528,
  8543,
  8585,
  8587,
  8592,
  9013,
  9083,
  9108,
  9110,
  9257,
  9280,
  9290,
  9312,
  9371,
  9450,
  9899,
  9901,
  10239,
  10496,
  11123,
  11126,
  11263,
  11493,
  11498,
  11503,
  11505,
  11513,
  11519,
  11647,
  11647,
  11744,
  11869,
  11904,
  11929,
  11931,
  12019,
  12032,
  12245,
  12272,
  12292,
  12296,
  12320,
  12330,
  12333,
  12336,
  12336,
  12342,
  12343,
  12349,
  12351,
  12441,
  12444,
  12448,
  12448,
  12539,
  12539,
  12736,
  12773,
  12783,
  12783,
  12829,
  12830,
  12880,
  12895,
  12924,
  12926,
  12977,
  12991,
  13004,
  13007,
  13175,
  13178,
  13278,
  13279,
  13311,
  13311,
  19904,
  19967,
  42128,
  42182,
  42509,
  42511,
  42607,
  42623,
  42654,
  42655,
  42736,
  42737,
  42752,
  42785,
  42888,
  42888,
  43010,
  43010,
  43014,
  43014,
  43019,
  43019,
  43045,
  43046,
  43048,
  43052,
  43064,
  43065,
  43124,
  43127,
  43204,
  43205,
  43232,
  43249,
  43263,
  43263,
  43302,
  43309,
  43335,
  43345,
  43392,
  43394,
  43443,
  43443,
  43446,
  43449,
  43452,
  43453,
  43493,
  43493,
  43561,
  43566,
  43569,
  43570,
  43573,
  43574,
  43587,
  43587,
  43596,
  43596,
  43644,
  43644,
  43696,
  43696,
  43698,
  43700,
  43703,
  43704,
  43710,
  43711,
  43713,
  43713,
  43756,
  43757,
  43766,
  43766,
  43882,
  43883,
  44005,
  44005,
  44008,
  44008,
  44013,
  44013,
  64286,
  64286,
  64297,
  64297,
  64451,
  64466,
  64830,
  64847,
  64912,
  64913,
  64968,
  65007,
  65021,
  65049,
  65056,
  65106,
  65108,
  65126,
  65128,
  65131,
  65279,
  65279,
  65281,
  65312,
  65339,
  65344,
  65371,
  65381,
  65504,
  65510,
  65512,
  65518,
  65520,
  65535,
  65793,
  65793,
  65856,
  65932,
  65936,
  65948,
  65952,
  65952,
  66045,
  66045,
  66272,
  66299,
  66422,
  66426,
  67871,
  67871,
  68097,
  68099,
  68101,
  68102,
  68108,
  68111,
  68152,
  68154,
  68159,
  68159,
  68325,
  68326,
  68409,
  68415,
  68900,
  68903,
  68912,
  68921,
  68928,
  68937,
  68969,
  68974,
  69216,
  69246,
  69291,
  69292,
  69328,
  69336,
  69370,
  69375,
  69446,
  69456,
  69506,
  69509,
  69633,
  69633,
  69688,
  69702,
  69714,
  69733,
  69744,
  69744,
  69747,
  69748,
  69759,
  69761,
  69811,
  69814,
  69817,
  69818,
  69826,
  69826,
  69888,
  69890,
  69927,
  69931,
  69933,
  69940,
  70003,
  70003,
  70016,
  70017,
  70070,
  70078,
  70089,
  70092,
  70095,
  70095,
  70191,
  70193,
  70196,
  70196,
  70198,
  70199,
  70206,
  70206,
  70209,
  70209,
  70367,
  70367,
  70371,
  70378,
  70400,
  70401,
  70459,
  70460,
  70464,
  70464,
  70502,
  70508,
  70512,
  70516,
  70587,
  70592,
  70606,
  70606,
  70608,
  70608,
  70610,
  70610,
  70625,
  70626,
  70712,
  70719,
  70722,
  70724,
  70726,
  70726,
  70750,
  70750,
  70835,
  70840,
  70842,
  70842,
  70847,
  70848,
  70850,
  70851,
  71090,
  71093,
  71100,
  71101,
  71103,
  71104,
  71132,
  71133,
  71219,
  71226,
  71229,
  71229,
  71231,
  71232,
  71264,
  71276,
  71339,
  71339,
  71341,
  71341,
  71344,
  71349,
  71351,
  71351,
  71453,
  71453,
  71455,
  71455,
  71458,
  71461,
  71463,
  71467,
  71727,
  71735,
  71737,
  71738,
  71995,
  71996,
  71998,
  71998,
  72003,
  72003,
  72148,
  72151,
  72154,
  72155,
  72160,
  72160,
  72193,
  72198,
  72201,
  72202,
  72243,
  72248,
  72251,
  72254,
  72263,
  72263,
  72273,
  72278,
  72281,
  72283,
  72330,
  72342,
  72344,
  72345,
  72544,
  72544,
  72546,
  72548,
  72550,
  72550,
  72752,
  72758,
  72760,
  72765,
  72850,
  72871,
  72874,
  72880,
  72882,
  72883,
  72885,
  72886,
  73009,
  73014,
  73018,
  73018,
  73020,
  73021,
  73023,
  73029,
  73031,
  73031,
  73104,
  73105,
  73109,
  73109,
  73111,
  73111,
  73459,
  73460,
  73472,
  73473,
  73526,
  73530,
  73536,
  73536,
  73538,
  73538,
  73562,
  73562,
  73685,
  73713,
  78912,
  78912,
  78919,
  78933,
  90398,
  90409,
  90413,
  90415,
  92912,
  92916,
  92976,
  92982,
  94031,
  94031,
  94095,
  94098,
  94178,
  94178,
  94180,
  94180,
  113821,
  113822,
  113824,
  113827,
  117760,
  117973,
  118e3,
  118012,
  118016,
  118451,
  118458,
  118480,
  118496,
  118512,
  118528,
  118573,
  118576,
  118598,
  119143,
  119145,
  119155,
  119170,
  119173,
  119179,
  119210,
  119213,
  119273,
  119274,
  119296,
  119365,
  119552,
  119638,
  120513,
  120513,
  120539,
  120539,
  120571,
  120571,
  120597,
  120597,
  120629,
  120629,
  120655,
  120655,
  120687,
  120687,
  120713,
  120713,
  120745,
  120745,
  120771,
  120771,
  120782,
  120831,
  121344,
  121398,
  121403,
  121452,
  121461,
  121461,
  121476,
  121476,
  121499,
  121503,
  121505,
  121519,
  122880,
  122886,
  122888,
  122904,
  122907,
  122913,
  122915,
  122916,
  122918,
  122922,
  123023,
  123023,
  123184,
  123190,
  123566,
  123566,
  123628,
  123631,
  123647,
  123647,
  124140,
  124143,
  124398,
  124399,
  124643,
  124643,
  124646,
  124646,
  124654,
  124655,
  124661,
  124661,
  125136,
  125142,
  125252,
  125258,
  126704,
  126705,
  126976,
  127019,
  127024,
  127123,
  127136,
  127150,
  127153,
  127167,
  127169,
  127183,
  127185,
  127221,
  127232,
  127247,
  127279,
  127279,
  127338,
  127343,
  127405,
  127405,
  127584,
  127589,
  127744,
  128728,
  128732,
  128748,
  128752,
  128764,
  128768,
  128985,
  128992,
  129003,
  129008,
  129008,
  129024,
  129035,
  129040,
  129095,
  129104,
  129113,
  129120,
  129159,
  129168,
  129197,
  129200,
  129211,
  129216,
  129217,
  129232,
  129240,
  129280,
  129623,
  129632,
  129645,
  129648,
  129660,
  129664,
  129674,
  129678,
  129734,
  129736,
  129736,
  129741,
  129756,
  129759,
  129770,
  129775,
  129784,
  129792,
  129938,
  129940,
  130042,
  131070,
  131071,
  196606,
  196607,
  262142,
  262143,
  327678,
  327679,
  393214,
  393215,
  458750,
  458751,
  524286,
  524287,
  589822,
  589823,
  655358,
  655359,
  720894,
  720895,
  786430,
  786431,
  851966,
  851967,
  917502,
  921599,
  983038,
  983039,
  1048574,
  1048575,
  1114110,
  1114111
];
var NATURAL_LETTER_RANGES = [
  65,
  90,
  97,
  122,
  170,
  170,
  181,
  181,
  186,
  186,
  192,
  214,
  216,
  246,
  248,
  705,
  710,
  721,
  736,
  740,
  748,
  748,
  750,
  750,
  880,
  884,
  886,
  887,
  890,
  893,
  895,
  895,
  902,
  902,
  904,
  906,
  908,
  908,
  910,
  929,
  931,
  1013,
  1015,
  1153,
  1162,
  1327,
  1329,
  1366,
  1369,
  1369,
  1376,
  1416,
  1488,
  1514,
  1519,
  1522,
  1568,
  1610,
  1646,
  1647,
  1649,
  1747,
  1749,
  1749,
  1765,
  1766,
  1774,
  1775,
  1786,
  1788,
  1791,
  1791,
  1808,
  1808,
  1810,
  1839,
  1869,
  1957,
  1969,
  1969,
  1994,
  2026,
  2036,
  2037,
  2042,
  2042,
  2048,
  2069,
  2074,
  2074,
  2084,
  2084,
  2088,
  2088,
  2112,
  2136,
  2144,
  2154,
  2160,
  2183,
  2185,
  2191,
  2208,
  2249,
  2308,
  2361,
  2365,
  2365,
  2384,
  2384,
  2392,
  2401,
  2417,
  2432,
  2437,
  2444,
  2447,
  2448,
  2451,
  2472,
  2474,
  2480,
  2482,
  2482,
  2486,
  2489,
  2493,
  2493,
  2510,
  2510,
  2524,
  2525,
  2527,
  2529,
  2544,
  2545,
  2556,
  2556,
  2565,
  2570,
  2575,
  2576,
  2579,
  2600,
  2602,
  2608,
  2610,
  2611,
  2613,
  2614,
  2616,
  2617,
  2649,
  2652,
  2654,
  2654,
  2674,
  2676,
  2693,
  2701,
  2703,
  2705,
  2707,
  2728,
  2730,
  2736,
  2738,
  2739,
  2741,
  2745,
  2749,
  2749,
  2768,
  2768,
  2784,
  2785,
  2809,
  2809,
  2821,
  2828,
  2831,
  2832,
  2835,
  2856,
  2858,
  2864,
  2866,
  2867,
  2869,
  2873,
  2877,
  2877,
  2908,
  2909,
  2911,
  2913,
  2929,
  2929,
  2947,
  2947,
  2949,
  2954,
  2958,
  2960,
  2962,
  2965,
  2969,
  2970,
  2972,
  2972,
  2974,
  2975,
  2979,
  2980,
  2984,
  2986,
  2990,
  3001,
  3024,
  3024,
  3077,
  3084,
  3086,
  3088,
  3090,
  3112,
  3114,
  3129,
  3133,
  3133,
  3160,
  3162,
  3164,
  3165,
  3168,
  3169,
  3200,
  3200,
  3205,
  3212,
  3214,
  3216,
  3218,
  3240,
  3242,
  3251,
  3253,
  3257,
  3261,
  3261,
  3292,
  3294,
  3296,
  3297,
  3313,
  3314,
  3332,
  3340,
  3342,
  3344,
  3346,
  3386,
  3389,
  3389,
  3406,
  3406,
  3412,
  3414,
  3423,
  3425,
  3450,
  3455,
  3461,
  3478,
  3482,
  3505,
  3507,
  3515,
  3517,
  3517,
  3520,
  3526,
  3585,
  3632,
  3634,
  3635,
  3648,
  3654,
  3713,
  3714,
  3716,
  3716,
  3718,
  3722,
  3724,
  3747,
  3749,
  3749,
  3751,
  3760,
  3762,
  3763,
  3773,
  3773,
  3776,
  3780,
  3782,
  3782,
  3804,
  3807,
  3840,
  3840,
  3904,
  3911,
  3913,
  3948,
  3976,
  3980,
  4096,
  4138,
  4159,
  4159,
  4176,
  4181,
  4186,
  4189,
  4193,
  4193,
  4197,
  4198,
  4206,
  4208,
  4213,
  4225,
  4238,
  4238,
  4256,
  4293,
  4295,
  4295,
  4301,
  4301,
  4304,
  4346,
  4348,
  4680,
  4682,
  4685,
  4688,
  4694,
  4696,
  4696,
  4698,
  4701,
  4704,
  4744,
  4746,
  4749,
  4752,
  4784,
  4786,
  4789,
  4792,
  4798,
  4800,
  4800,
  4802,
  4805,
  4808,
  4822,
  4824,
  4880,
  4882,
  4885,
  4888,
  4954,
  4992,
  5007,
  5024,
  5109,
  5112,
  5117,
  5121,
  5740,
  5743,
  5759,
  5761,
  5786,
  5792,
  5866,
  5873,
  5880,
  5888,
  5905,
  5919,
  5937,
  5952,
  5969,
  5984,
  5996,
  5998,
  6e3,
  6016,
  6067,
  6103,
  6103,
  6108,
  6108,
  6176,
  6264,
  6272,
  6276,
  6279,
  6312,
  6314,
  6314,
  6320,
  6389,
  6400,
  6430,
  6480,
  6509,
  6512,
  6516,
  6528,
  6571,
  6576,
  6601,
  6656,
  6678,
  6688,
  6740,
  6823,
  6823,
  6917,
  6963,
  6981,
  6988,
  7043,
  7072,
  7086,
  7087,
  7098,
  7141,
  7168,
  7203,
  7245,
  7247,
  7258,
  7293,
  7296,
  7306,
  7312,
  7354,
  7357,
  7359,
  7401,
  7404,
  7406,
  7411,
  7413,
  7414,
  7418,
  7418,
  7424,
  7615,
  7680,
  7957,
  7960,
  7965,
  7968,
  8005,
  8008,
  8013,
  8016,
  8023,
  8025,
  8025,
  8027,
  8027,
  8029,
  8029,
  8031,
  8061,
  8064,
  8116,
  8118,
  8124,
  8126,
  8126,
  8130,
  8132,
  8134,
  8140,
  8144,
  8147,
  8150,
  8155,
  8160,
  8172,
  8178,
  8180,
  8182,
  8188,
  8305,
  8305,
  8319,
  8319,
  8336,
  8348,
  8450,
  8450,
  8455,
  8455,
  8458,
  8467,
  8469,
  8469,
  8473,
  8477,
  8484,
  8484,
  8486,
  8486,
  8488,
  8488,
  8490,
  8493,
  8495,
  8505,
  8508,
  8511,
  8517,
  8521,
  8526,
  8526,
  8579,
  8580,
  11264,
  11492,
  11499,
  11502,
  11506,
  11507,
  11520,
  11557,
  11559,
  11559,
  11565,
  11565,
  11568,
  11623,
  11631,
  11631,
  11648,
  11670,
  11680,
  11686,
  11688,
  11694,
  11696,
  11702,
  11704,
  11710,
  11712,
  11718,
  11720,
  11726,
  11728,
  11734,
  11736,
  11742,
  11823,
  11823,
  12293,
  12294,
  12337,
  12341,
  12347,
  12348,
  12353,
  12438,
  12445,
  12447,
  12449,
  12538,
  12540,
  12543,
  12549,
  12591,
  12593,
  12686,
  12704,
  12735,
  12784,
  12799,
  13312,
  19903,
  19968,
  42124,
  42192,
  42237,
  42240,
  42508,
  42512,
  42527,
  42538,
  42539,
  42560,
  42606,
  42623,
  42653,
  42656,
  42725,
  42775,
  42783,
  42786,
  42888,
  42891,
  42972,
  42993,
  43009,
  43011,
  43013,
  43015,
  43018,
  43020,
  43042,
  43072,
  43123,
  43138,
  43187,
  43250,
  43255,
  43259,
  43259,
  43261,
  43262,
  43274,
  43301,
  43312,
  43334,
  43360,
  43388,
  43396,
  43442,
  43471,
  43471,
  43488,
  43492,
  43494,
  43503,
  43514,
  43518,
  43520,
  43560,
  43584,
  43586,
  43588,
  43595,
  43616,
  43638,
  43642,
  43642,
  43646,
  43695,
  43697,
  43697,
  43701,
  43702,
  43705,
  43709,
  43712,
  43712,
  43714,
  43714,
  43739,
  43741,
  43744,
  43754,
  43762,
  43764,
  43777,
  43782,
  43785,
  43790,
  43793,
  43798,
  43808,
  43814,
  43816,
  43822,
  43824,
  43866,
  43868,
  43881,
  43888,
  44002,
  44032,
  55203,
  55216,
  55238,
  55243,
  55291,
  63744,
  64109,
  64112,
  64217,
  64256,
  64262,
  64275,
  64279,
  64285,
  64285,
  64287,
  64296,
  64298,
  64310,
  64312,
  64316,
  64318,
  64318,
  64320,
  64321,
  64323,
  64324,
  64326,
  64433,
  64467,
  64829,
  64848,
  64911,
  64914,
  64967,
  65008,
  65019,
  65136,
  65140,
  65142,
  65276,
  65313,
  65338,
  65345,
  65370,
  65382,
  65470,
  65474,
  65479,
  65482,
  65487,
  65490,
  65495,
  65498,
  65500,
  65536,
  65547,
  65549,
  65574,
  65576,
  65594,
  65596,
  65597,
  65599,
  65613,
  65616,
  65629,
  65664,
  65786,
  66176,
  66204,
  66208,
  66256,
  66304,
  66335,
  66349,
  66368,
  66370,
  66377,
  66384,
  66421,
  66432,
  66461,
  66464,
  66499,
  66504,
  66511,
  66560,
  66717,
  66736,
  66771,
  66776,
  66811,
  66816,
  66855,
  66864,
  66915,
  66928,
  66938,
  66940,
  66954,
  66956,
  66962,
  66964,
  66965,
  66967,
  66977,
  66979,
  66993,
  66995,
  67001,
  67003,
  67004,
  67008,
  67059,
  67072,
  67382,
  67392,
  67413,
  67424,
  67431,
  67456,
  67461,
  67463,
  67504,
  67506,
  67514,
  67584,
  67589,
  67592,
  67592,
  67594,
  67637,
  67639,
  67640,
  67644,
  67644,
  67647,
  67669,
  67680,
  67702,
  67712,
  67742,
  67808,
  67826,
  67828,
  67829,
  67840,
  67861,
  67872,
  67897,
  67904,
  67929,
  67968,
  68023,
  68030,
  68031,
  68096,
  68096,
  68112,
  68115,
  68117,
  68119,
  68121,
  68149,
  68192,
  68220,
  68224,
  68252,
  68288,
  68295,
  68297,
  68324,
  68352,
  68405,
  68416,
  68437,
  68448,
  68466,
  68480,
  68497,
  68608,
  68680,
  68736,
  68786,
  68800,
  68850,
  68864,
  68899,
  68938,
  68965,
  68975,
  68997,
  69248,
  69289,
  69296,
  69297,
  69314,
  69319,
  69376,
  69404,
  69415,
  69415,
  69424,
  69445,
  69488,
  69505,
  69552,
  69572,
  69600,
  69622,
  69635,
  69687,
  69745,
  69746,
  69749,
  69749,
  69763,
  69807,
  69840,
  69864,
  69891,
  69926,
  69956,
  69956,
  69959,
  69959,
  69968,
  70002,
  70006,
  70006,
  70019,
  70066,
  70081,
  70084,
  70106,
  70106,
  70108,
  70108,
  70144,
  70161,
  70163,
  70187,
  70207,
  70208,
  70272,
  70278,
  70280,
  70280,
  70282,
  70285,
  70287,
  70301,
  70303,
  70312,
  70320,
  70366,
  70405,
  70412,
  70415,
  70416,
  70419,
  70440,
  70442,
  70448,
  70450,
  70451,
  70453,
  70457,
  70461,
  70461,
  70480,
  70480,
  70493,
  70497,
  70528,
  70537,
  70539,
  70539,
  70542,
  70542,
  70544,
  70581,
  70583,
  70583,
  70609,
  70609,
  70611,
  70611,
  70656,
  70708,
  70727,
  70730,
  70751,
  70753,
  70784,
  70831,
  70852,
  70853,
  70855,
  70855,
  71040,
  71086,
  71128,
  71131,
  71168,
  71215,
  71236,
  71236,
  71296,
  71338,
  71352,
  71352,
  71424,
  71450,
  71488,
  71494,
  71680,
  71723,
  71840,
  71903,
  71935,
  71942,
  71945,
  71945,
  71948,
  71955,
  71957,
  71958,
  71960,
  71983,
  71999,
  71999,
  72001,
  72001,
  72096,
  72103,
  72106,
  72144,
  72161,
  72161,
  72163,
  72163,
  72192,
  72192,
  72203,
  72242,
  72250,
  72250,
  72272,
  72272,
  72284,
  72329,
  72349,
  72349,
  72368,
  72440,
  72640,
  72672,
  72704,
  72712,
  72714,
  72750,
  72768,
  72768,
  72818,
  72847,
  72960,
  72966,
  72968,
  72969,
  72971,
  73008,
  73030,
  73030,
  73056,
  73061,
  73063,
  73064,
  73066,
  73097,
  73112,
  73112,
  73136,
  73179,
  73440,
  73458,
  73474,
  73474,
  73476,
  73488,
  73490,
  73523,
  73648,
  73648,
  73728,
  74649,
  74880,
  75075,
  77712,
  77808,
  77824,
  78895,
  78913,
  78918,
  78944,
  82938,
  82944,
  83526,
  90368,
  90397,
  92160,
  92728,
  92736,
  92766,
  92784,
  92862,
  92880,
  92909,
  92928,
  92975,
  92992,
  92995,
  93027,
  93047,
  93053,
  93071,
  93504,
  93548,
  93760,
  93823,
  93856,
  93880,
  93883,
  93907,
  93952,
  94026,
  94032,
  94032,
  94099,
  94111,
  94176,
  94177,
  94179,
  94179,
  94194,
  94195,
  94208,
  101589,
  101631,
  101662,
  101760,
  101874,
  110576,
  110579,
  110581,
  110587,
  110589,
  110590,
  110592,
  110882,
  110898,
  110898,
  110928,
  110930,
  110933,
  110933,
  110948,
  110951,
  110960,
  111355,
  113664,
  113770,
  113776,
  113788,
  113792,
  113800,
  113808,
  113817,
  119808,
  119892,
  119894,
  119964,
  119966,
  119967,
  119970,
  119970,
  119973,
  119974,
  119977,
  119980,
  119982,
  119993,
  119995,
  119995,
  119997,
  120003,
  120005,
  120069,
  120071,
  120074,
  120077,
  120084,
  120086,
  120092,
  120094,
  120121,
  120123,
  120126,
  120128,
  120132,
  120134,
  120134,
  120138,
  120144,
  120146,
  120485,
  120488,
  120512,
  120514,
  120538,
  120540,
  120570,
  120572,
  120596,
  120598,
  120628,
  120630,
  120654,
  120656,
  120686,
  120688,
  120712,
  120714,
  120744,
  120746,
  120770,
  120772,
  120779,
  122624,
  122654,
  122661,
  122666,
  122928,
  122989,
  123136,
  123180,
  123191,
  123197,
  123214,
  123214,
  123536,
  123565,
  123584,
  123627,
  124112,
  124139,
  124368,
  124397,
  124400,
  124400,
  124608,
  124638,
  124640,
  124642,
  124644,
  124645,
  124647,
  124653,
  124656,
  124660,
  124670,
  124671,
  124896,
  124902,
  124904,
  124907,
  124909,
  124910,
  124912,
  124926,
  124928,
  125124,
  125184,
  125251,
  125259,
  125259,
  126464,
  126467,
  126469,
  126495,
  126497,
  126498,
  126500,
  126500,
  126503,
  126503,
  126505,
  126514,
  126516,
  126519,
  126521,
  126521,
  126523,
  126523,
  126530,
  126530,
  126535,
  126535,
  126537,
  126537,
  126539,
  126539,
  126541,
  126543,
  126545,
  126546,
  126548,
  126548,
  126551,
  126551,
  126553,
  126553,
  126555,
  126555,
  126557,
  126557,
  126559,
  126559,
  126561,
  126562,
  126564,
  126564,
  126567,
  126570,
  126572,
  126578,
  126580,
  126583,
  126585,
  126588,
  126590,
  126590,
  126592,
  126601,
  126603,
  126619,
  126625,
  126627,
  126629,
  126633,
  126635,
  126651,
  131072,
  173791,
  173824,
  178205,
  178208,
  183981,
  183984,
  191456,
  191472,
  192093,
  194560,
  195101,
  196608,
  201546,
  201552,
  210041
];

// packages/core/src/classify.ts
function isInRanges(codePoint, ranges) {
  let low = 0;
  let high = ranges.length / 2 - 1;
  while (low <= high) {
    const middle = low + high >> 1;
    const start = ranges[middle * 2];
    const end = ranges[middle * 2 + 1];
    if (codePoint < start) high = middle - 1;
    else if (codePoint > end) low = middle + 1;
    else return true;
  }
  return false;
}
function isRtlCodePoint(codePoint) {
  return isInRanges(codePoint, RTL_BIDI_RANGES);
}
function classifyBidiStrongCharacter(character) {
  const codePoint = character.codePointAt(0);
  if (codePoint === void 0 || isInRanges(codePoint, NON_STRONG_BIDI_RANGES)) return "neutral";
  return isRtlCodePoint(codePoint) ? "rtl" : "ltr";
}
function classifyCharacter(character) {
  const codePoint = character.codePointAt(0);
  if (codePoint === void 0) return "neutral";
  return isInRanges(codePoint, NATURAL_LETTER_RANGES) ? classifyBidiStrongCharacter(character) : "neutral";
}

// packages/core/src/detect.ts
var DEFAULT_OPTIONS = {
  strategy: "content-majority",
  fallback: "neutral",
  inheritedDirection: "ltr",
  minimumStrongCharacters: 1,
  majorityThreshold: 0.5,
  excludeTechnicalTokens: true
};
var KNOWN_TECHNICAL_TOKENS = /* @__PURE__ */ new Set([
  "ai",
  "api",
  "anthropic",
  "chatgpt",
  "claude",
  "cli",
  "codex",
  "copilot",
  "cursor",
  "deepseek",
  "electron",
  "gemini",
  "github",
  "gitlab",
  "grok",
  "huggingface",
  "javascript",
  "json",
  "llama",
  "markdown",
  "mistral",
  "node",
  "npm",
  "openai",
  "python",
  "qwen",
  "react",
  "rust",
  "svelte",
  "typescript",
  "url",
  "version",
  "vscode",
  "vue",
  "web",
  "webpack",
  "yaml"
]);
function normalizeOptions(options = {}) {
  const strategy = options.strategy ?? DEFAULT_OPTIONS.strategy;
  const majorityStrategy = strategy === "content-majority" || strategy === "semantic-dominant" || strategy === "majority";
  return {
    strategy,
    fallback: options.fallback ?? options.inheritedDirection ?? DEFAULT_OPTIONS.fallback,
    inheritedDirection: options.inheritedDirection ?? DEFAULT_OPTIONS.inheritedDirection,
    minimumStrongCharacters: Math.max(1, options.minimumStrongCharacters ?? DEFAULT_OPTIONS.minimumStrongCharacters),
    majorityThreshold: Math.min(1, Math.max(0.5, options.majorityThreshold ?? DEFAULT_OPTIONS.majorityThreshold)),
    // Compatibility/strict first-strong modes must see the real first strong
    // character (including a leading technical identifier), like dir="auto".
    excludeTechnicalTokens: options.excludeTechnicalTokens ?? majorityStrategy
  };
}
function addRange(ranges, text, start, end, kind) {
  if (end > start) ranges.push({ text: text.slice(start, end), start, end, kind });
}
function addMatches(text, ranges, expression, kind, group = 0) {
  expression.lastIndex = 0;
  let match;
  while ((match = expression.exec(text)) !== null) {
    const value = match[group];
    if (value === void 0) continue;
    const start = match.index + match[0].indexOf(value);
    addRange(ranges, text, start, start + value.length, kind);
  }
}
function trimTechnicalPunctuation(value) {
  while (/[.,;:!?،؛؟。।۔]$/u.test(value)) value = value.slice(0, -1);
  return value;
}
function addValidatedMatches(text, ranges, expression, kind, validate, group = 0) {
  expression.lastIndex = 0;
  let match;
  while ((match = expression.exec(text)) !== null) {
    const value = match[group];
    if (value === void 0 || !validate(value)) continue;
    const start = match.index + match[0].indexOf(value);
    addRange(ranges, text, start, start + value.length, kind);
  }
}
function addNormalizedMatches(text, ranges, expression, kind, normalize, group = 0) {
  expression.lastIndex = 0;
  let match;
  while ((match = expression.exec(text)) !== null) {
    const original = match[group];
    if (original === void 0) continue;
    const value = normalize(original);
    if (!value) continue;
    const start = match.index + match[0].indexOf(original);
    addRange(ranges, text, start, start + value.length, kind);
  }
}
function isIpv4(value) {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/u.test(part) && Number(part) <= 255);
}
function isIpv6(value) {
  if (!/^[0-9A-F:]+$/iu.test(value) || !value.includes(":")) return false;
  const compression = value.indexOf("::");
  if (compression !== value.lastIndexOf("::")) return false;
  const sides = compression >= 0 ? value.split("::") : [value];
  const groups = sides.flatMap((side) => side ? side.split(":") : []);
  if (!groups.every((group) => /^[0-9A-F]{1,4}$/iu.test(group))) return false;
  return compression >= 0 ? groups.length < 8 : groups.length === 8;
}
function isTechnicalIdentifier(token) {
  const normalized = token.toLowerCase();
  return KNOWN_TECHNICAL_TOKENS.has(normalized) || /[0-9_.-]/u.test(token) || /^[A-Z]{2,}$/u.test(token) || /[a-z][A-Z]/u.test(token);
}
function findTechnicalTokenRanges(text) {
  const ranges = [];
  addMatches(text, ranges, /(`+)[^\r\n]*?\1/gu, "code");
  addMatches(text, ranges, /<\/?[A-Za-z][^<>\r\n]*>/gu, "html");
  addMatches(text, ranges, /(?:\$\$[^\r\n]*?\$\$|\$[^$\r\n]+\$|\\\([^\r\n]*?\\\))/gu, "math");
  const urls = /\b(?:https?|ftp):\/\/[^\s<>{}"']+/giu;
  let urlMatch;
  while ((urlMatch = urls.exec(text)) !== null) {
    let value = urlMatch[0];
    value = trimTechnicalPunctuation(value);
    for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
      while (value.endsWith(close) && [...value].filter((character) => character === close).length > [...value].filter((character) => character === open).length) {
        value = value.slice(0, -1);
      }
    }
    addRange(ranges, text, urlMatch.index, urlMatch.index + value.length, "url");
  }
  addMatches(text, ranges, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, "email");
  addNormalizedMatches(
    text,
    ranges,
    /(?<![\p{L}\p{N}_])(?:[A-Za-z]:[\\/]|\.{0,2}\/|~\/)[^\s<>()\x5B\x5D{}]+/gu,
    "path",
    trimTechnicalPunctuation
  );
  addMatches(text, ranges, /\b(?:[A-Za-z0-9_.-]+[\\/])+(?:[A-Za-z0-9_.-]+)\b/gu, "path");
  addMatches(text, ranges, /(?<![\w@])@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*/giu, "identifier");
  addMatches(text, ranges, /(?:\$\{?[A-Z_][A-Z0-9_]*\}?|%[A-Z_][A-Z0-9_]*%)/gu, "identifier");
  addMatches(text, ranges, /\b(?:npm|pnpm|yarn|npx|git|pip|python|node|cargo|go|docker|kubectl)(?:\s+(?:--?[A-Za-z0-9_-]+|[@./\\A-Za-z0-9_:=+-]+|'[^'\r\n]*'|"[^"\r\n]*"))+/gu, "command");
  addValidatedMatches(text, ranges, /\b(?:\d{1,3}\.){3}\d{1,3}\b/gu, "number", isIpv4);
  addValidatedMatches(
    text,
    ranges,
    /(?<![0-9A-F:])(?:[0-9A-F]{0,4}:){2,7}[0-9A-F]{0,4}(?![0-9A-F:])/giu,
    "number",
    isIpv6
  );
  addMatches(text, ranges, /(?<![\p{L}\p{N}_])\+?\d[\d ()-]{6,}\d(?![\p{L}\p{N}_])/gu, "number");
  addMatches(text, ranges, /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[T ]\d{1,2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)?\b/gu, "number");
  addMatches(text, ranges, /\b\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?\b/giu, "number");
  addMatches(text, ranges, /\bv?\d+(?:\.\d+){1,}\b/gu, "version");
  addMatches(text, ranges, /\b[0-9a-f]{7,40}\b/giu, "hash");
  addMatches(text, ranges, /(?<![\p{L}\p{N}_])[+-]?(?:\d+(?:[.,]\d+)?|[\u0660-\u0669]+(?:[\u066B\u066C][\u0660-\u0669]+)?|[\u06F0-\u06F9]+(?:[.,][\u06F0-\u06F9]+)?)(?![\p{L}\p{N}_])/gu, "number");
  const words = /\b[A-Za-z][A-Za-z0-9_.-]*\b/gu;
  let match;
  while ((match = words.exec(text)) !== null) {
    const token = match[0];
    if (isTechnicalIdentifier(token)) addRange(ranges, text, match.index, match.index + token.length, "identifier");
  }
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
      previous.text = text.slice(previous.start, previous.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}
function countStrongCharacters(text, options = {}) {
  const normalized = normalizeOptions(options);
  const technicalTokens = normalized.excludeTechnicalTokens ? findTechnicalTokenRanges(text) : [];
  let ltr = 0;
  let rtl = 0;
  let firstStrong = "neutral";
  let index = 0;
  let technicalIndex = 0;
  const classify = normalized.strategy === "first-strong" || normalized.strategy === "strict-uax9" ? classifyBidiStrongCharacter : classifyCharacter;
  for (const character of text) {
    while (technicalIndex < technicalTokens.length && index >= technicalTokens[technicalIndex].end) {
      technicalIndex += 1;
    }
    const technicalRange = technicalTokens[technicalIndex];
    const isTechnical = technicalRange !== void 0 && index >= technicalRange.start && index < technicalRange.end;
    if (!isTechnical) {
      const direction = classify(character);
      if (direction === "ltr") ltr += 1;
      if (direction === "rtl") rtl += 1;
      if (firstStrong === "neutral" && direction !== "neutral") firstStrong = direction;
    }
    index += character.length;
  }
  return { ltr, rtl, total: ltr + rtl, firstStrong, technicalTokens };
}
function fallbackDirection(options) {
  return options.fallback;
}
function detectDirection(text, options = {}) {
  const normalized = normalizeOptions(options);
  if (normalized.strategy === "ltr" || normalized.strategy === "rtl") return normalized.strategy;
  if (normalized.strategy === "inherit") return normalized.inheritedDirection;
  const counts = countStrongCharacters(text, normalized);
  if (counts.total < normalized.minimumStrongCharacters) return fallbackDirection(normalized);
  if (normalized.strategy === "first-strong" || normalized.strategy === "strict-uax9") {
    return counts.firstStrong === "neutral" ? fallbackDirection(normalized) : counts.firstStrong;
  }
  if (counts.rtl > counts.ltr && counts.rtl / counts.total >= normalized.majorityThreshold) return "rtl";
  if (counts.ltr > counts.rtl && counts.ltr / counts.total >= normalized.majorityThreshold) return "ltr";
  return counts.firstStrong === "neutral" ? fallbackDirection(normalized) : counts.firstStrong;
}
function confidenceFor(counts, direction) {
  if (counts.total === 0 || direction === "neutral") return 0;
  const matching = direction === "rtl" ? counts.rtl : counts.ltr;
  return Number((matching / counts.total).toFixed(4));
}
function splitParagraphs(text) {
  const paragraphs = [];
  const separator = /\r\n|\n|\r|\u2029/gu;
  let start = 0;
  let match;
  while ((match = separator.exec(text)) !== null) {
    paragraphs.push({ text: text.slice(start, match.index), start, end: match.index });
    start = match.index + match[0].length;
  }
  paragraphs.push({ text: text.slice(start), start, end: text.length });
  return paragraphs;
}
function analyzeParagraph(text, start = 0, options = {}) {
  const countsWithFirst = countStrongCharacters(text, options);
  const counts = {
    ltr: countsWithFirst.ltr,
    rtl: countsWithFirst.rtl,
    total: countsWithFirst.total
  };
  const direction = detectDirection(text, options);
  return {
    text,
    start,
    end: start + text.length,
    direction,
    firstStrong: countsWithFirst.firstStrong,
    confidence: confidenceFor(counts, direction),
    counts
  };
}
function analyzeText(text, options = {}) {
  const countsWithFirst = countStrongCharacters(text, options);
  const counts = {
    ltr: countsWithFirst.ltr,
    rtl: countsWithFirst.rtl,
    total: countsWithFirst.total
  };
  const direction = detectDirection(text, options);
  const rawCountsWithFirst = countStrongCharacters(text, {
    ...options,
    strategy: "content-majority",
    excludeTechnicalTokens: false
  });
  const rawCounts = {
    ltr: rawCountsWithFirst.ltr,
    rtl: rawCountsWithFirst.rtl,
    total: rawCountsWithFirst.total
  };
  const paragraphs = splitParagraphs(text).map((paragraph) => analyzeParagraph(paragraph.text, paragraph.start, options));
  return {
    text,
    direction,
    firstStrong: countsWithFirst.firstStrong,
    confidence: confidenceFor(counts, direction),
    counts,
    rawCounts,
    paragraphs,
    mixed: rawCounts.ltr > 0 && rawCounts.rtl > 0
  };
}

// packages/core/src/security.ts
var CONTROL_METADATA = /* @__PURE__ */ new Map([
  [1564, { name: "ARABIC LETTER MARK", risk: "low", category: "mark" }],
  [8206, { name: "LEFT-TO-RIGHT MARK", risk: "low", category: "mark" }],
  [8207, { name: "RIGHT-TO-LEFT MARK", risk: "low", category: "mark" }],
  [8234, { name: "LEFT-TO-RIGHT EMBEDDING", risk: "high", category: "embedding" }],
  [8235, { name: "RIGHT-TO-LEFT EMBEDDING", risk: "high", category: "embedding" }],
  [8236, { name: "POP DIRECTIONAL FORMATTING", risk: "medium", category: "pop" }],
  [8237, { name: "LEFT-TO-RIGHT OVERRIDE", risk: "high", category: "override" }],
  [8238, { name: "RIGHT-TO-LEFT OVERRIDE", risk: "high", category: "override" }],
  [8294, { name: "LEFT-TO-RIGHT ISOLATE", risk: "medium", category: "isolate" }],
  [8295, { name: "RIGHT-TO-LEFT ISOLATE", risk: "medium", category: "isolate" }],
  [8296, { name: "FIRST STRONG ISOLATE", risk: "medium", category: "isolate" }],
  [8297, { name: "POP DIRECTIONAL ISOLATE", risk: "medium", category: "pop" }],
  [8298, { name: "INHIBIT SYMMETRIC SWAPPING", risk: "medium", category: "deprecated" }],
  [8299, { name: "ACTIVATE SYMMETRIC SWAPPING", risk: "medium", category: "deprecated" }],
  [8300, { name: "INHIBIT ARABIC FORM SHAPING", risk: "medium", category: "deprecated" }],
  [8301, { name: "ACTIVATE ARABIC FORM SHAPING", risk: "medium", category: "deprecated" }],
  [8302, { name: "NATIONAL DIGIT SHAPES", risk: "medium", category: "deprecated" }],
  [8303, { name: "NOMINAL DIGIT SHAPES", risk: "medium", category: "deprecated" }]
]);
var REMEDIATION = "Remove the control unless a documented plain-text protocol requires it; prefer semantic markup and isolation.";
function severityForRisk(risk) {
  if (risk === "high") return "high";
  if (risk === "medium") return "warning";
  return "info";
}
function rangeFor(control) {
  return {
    utf16: { start: control.index, end: control.end },
    codePoint: { start: control.codePointIndex, end: control.codePointIndex + 1 }
  };
}
function codeForControl(control) {
  if (control.category === "override") return "BIDI_OVERRIDE_CONTROL";
  if (control.category === "embedding") return "BIDI_EMBEDDING_CONTROL";
  if (control.category === "isolate") return "BIDI_ISOLATE_CONTROL";
  if (control.category === "mark") return "BIDI_DIRECTIONAL_MARK";
  if (control.category === "deprecated") return "BIDI_DEPRECATED_CONTROL";
  return "BIDI_POP_CONTROL";
}
function controlFinding(control) {
  return {
    code: codeForControl(control),
    severity: severityForRisk(control.risk),
    message: `${control.name} (${control.codePoint}) is invisible and changes bidirectional interpretation.`,
    sourceRange: rangeFor(control),
    remediation: REMEDIATION,
    control
  };
}
function findBidiControls(text) {
  const findings = [];
  let utf16Index = 0;
  let codePointIndex = 0;
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    const metadata = CONTROL_METADATA.get(codePoint);
    if (metadata) {
      findings.push({
        character,
        codePoint: `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`,
        index: utf16Index,
        end: utf16Index + character.length,
        codePointIndex,
        ...metadata
      });
    }
    utf16Index += character.length;
    codePointIndex += 1;
  }
  return findings;
}
function visibleBidiControls(text) {
  const namesByCodePoint = new Map([...CONTROL_METADATA].map(([codePoint, metadata]) => [codePoint, metadata.name]));
  let result = "";
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    const name = namesByCodePoint.get(codePoint);
    result += name ? `\u27E6${name}\u27E7` : character;
  }
  return result;
}
function lastFrameIndex(stack, kind) {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index]?.kind === kind) return index;
  }
  return -1;
}
function balanceFindings(controls) {
  const findings = [];
  const stack = [];
  for (const control of controls) {
    const codePoint = control.codePoint;
    if (codePoint === "U+202A" || codePoint === "U+202B" || codePoint === "U+202D" || codePoint === "U+202E") {
      stack.push({ kind: "embedding", control });
      continue;
    }
    if (codePoint === "U+2066" || codePoint === "U+2067" || codePoint === "U+2068") {
      stack.push({ kind: "isolate", control });
      continue;
    }
    if (codePoint === "U+202C") {
      const isolateIndex = lastFrameIndex(stack, "isolate");
      const embeddingIndex = lastFrameIndex(stack, "embedding");
      if (embeddingIndex <= isolateIndex) {
        findings.push({
          code: "BIDI_UNMATCHED_PDF",
          severity: "high",
          message: "POP DIRECTIONAL FORMATTING has no matching active embedding or override.",
          sourceRange: rangeFor(control),
          remediation: "Remove the unmatched PDF or add the intended opener within the same isolate.",
          control
        });
      } else {
        stack.splice(embeddingIndex, 1);
      }
      continue;
    }
    if (codePoint === "U+2069") {
      const isolateIndex = lastFrameIndex(stack, "isolate");
      if (isolateIndex < 0) {
        findings.push({
          code: "BIDI_UNMATCHED_PDI",
          severity: "high",
          message: "POP DIRECTIONAL ISOLATE has no matching isolate opener.",
          sourceRange: rangeFor(control),
          remediation: "Remove the unmatched PDI or add the intended LRI, RLI, or FSI opener.",
          control
        });
      } else {
        const crossing = stack.slice(isolateIndex + 1).filter((frame) => frame.kind === "embedding");
        for (const frame of crossing) {
          findings.push({
            code: "BIDI_FORMAT_CROSSES_ISOLATE_BOUNDARY",
            severity: "high",
            message: `${frame.control.name} is not closed before the containing isolate ends.`,
            sourceRange: rangeFor(frame.control),
            remediation: "Close the embedding or override with PDF before PDI.",
            control: frame.control
          });
        }
        stack.splice(isolateIndex);
      }
    }
  }
  for (const frame of stack) {
    findings.push({
      code: frame.kind === "isolate" ? "BIDI_UNCLOSED_ISOLATE" : "BIDI_UNCLOSED_EMBEDDING",
      severity: "high",
      message: `${frame.control.name} is not terminated before the end of the text.`,
      sourceRange: rangeFor(frame.control),
      remediation: frame.kind === "isolate" ? "Add the matching PDI or remove the isolate opener." : "Add the matching PDF or remove the embedding/override opener.",
      control: frame.control
    });
  }
  return findings;
}
function zeroWidthSpaceFindings(text) {
  const findings = [];
  let utf16Index = 0;
  let codePointIndex = 0;
  for (const character of text) {
    if (character === "\u200B") {
      findings.push({
        code: "HIDDEN_ZERO_WIDTH_SPACE",
        severity: "warning",
        message: "ZERO WIDTH SPACE (U+200B) is hidden and can disguise identifiers, links, or filenames.",
        sourceRange: {
          utf16: { start: utf16Index, end: utf16Index + 1 },
          codePoint: { start: codePointIndex, end: codePointIndex + 1 }
        },
        remediation: "Remove it from identifiers and source-like content unless its use is explicitly required."
      });
    }
    utf16Index += character.length;
    codePointIndex += 1;
  }
  return findings;
}
function scanBidiSecurity(text, options = {}) {
  const mode = options.mode ?? "audit";
  if (mode === "off") return { mode, safe: true, shouldBlock: false, controls: [], findings: [] };
  const controls = findBidiControls(text);
  const findings = [
    ...controls.map(controlFinding),
    ...balanceFindings(controls),
    ...zeroWidthSpaceFindings(text)
  ].sort((a, b) => a.sourceRange.utf16.start - b.sourceRange.utf16.start || a.code.localeCompare(b.code));
  const hasHigh = findings.some((finding) => finding.severity === "high");
  return {
    mode,
    safe: !hasHigh,
    shouldBlock: mode === "strict" ? findings.length > 0 : mode === "warn" && hasHigh,
    controls,
    findings
  };
}
function sanitizeBidiControls(text, options = {}) {
  const remove = new Set(options.remove ?? ["high", "medium", "low"]);
  const removed = [];
  let output = "";
  let utf16Index = 0;
  let codePointIndex = 0;
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    const metadata = CONTROL_METADATA.get(codePoint);
    if (metadata && remove.has(metadata.risk)) {
      removed.push({
        character,
        codePoint: `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`,
        index: utf16Index,
        end: utf16Index + character.length,
        codePointIndex,
        ...metadata
      });
    } else {
      output += character;
    }
    utf16Index += character.length;
    codePointIndex += 1;
  }
  return { text: output, removed };
}

// packages/core/src/intervention.ts
function needsBidiIntervention(text, options = {}) {
  if (options.intervention === "always") return true;
  if (findBidiControls(text).length > 0) return true;
  let hasLtr = false;
  for (const character of text) {
    const direction = classifyBidiStrongCharacter(character);
    if (direction === "rtl") return true;
    if (direction === "ltr") hasLtr = true;
  }
  return options.inheritedDirection === "rtl" && (hasLtr || text.length > 0);
}

// packages/core/src/segments.ts
function attachSourceRanges(text, isolations) {
  const codePointAtUtf16 = new Uint32Array(text.length + 1);
  let utf16Offset = 0;
  let codePointOffset = 0;
  for (const character of text) {
    codePointAtUtf16[utf16Offset] = codePointOffset;
    if (character.length === 2) codePointAtUtf16[utf16Offset + 1] = codePointOffset;
    utf16Offset += character.length;
    codePointOffset += 1;
    codePointAtUtf16[utf16Offset] = codePointOffset;
  }
  return isolations.map((isolation) => ({
    ...isolation,
    sourceRange: {
      utf16: { start: isolation.start, end: isolation.end },
      codePoint: {
        start: codePointAtUtf16[isolation.start],
        end: codePointAtUtf16[isolation.end]
      }
    }
  }));
}
function resolveNeutralRuns(runs) {
  const previousStrong = new Array(runs.length).fill("neutral");
  const nextStrong = new Array(runs.length).fill("neutral");
  let previous = "neutral";
  let next = "neutral";
  for (let index = 0; index < runs.length; index += 1) {
    previousStrong[index] = previous;
    const direction = runs[index].direction;
    if (direction !== "neutral") previous = direction;
  }
  for (let index = runs.length - 1; index >= 0; index -= 1) {
    nextStrong[index] = next;
    const direction = runs[index].direction;
    if (direction !== "neutral") next = direction;
  }
  return runs.map((run, index) => {
    if (run.direction !== "neutral") return run;
    const before = previousStrong[index] ?? "neutral";
    const after = nextStrong[index] ?? "neutral";
    const direction = before === after && before !== "neutral" ? before : before !== "neutral" ? before : after;
    return { ...run, direction };
  });
}
function mergeAdjacent(runs) {
  const merged = [];
  for (const run of runs) {
    const previous = merged.at(-1);
    if (previous && previous.direction === run.direction) {
      previous.text += run.text;
      previous.end = run.end;
    } else {
      merged.push({ ...run });
    }
  }
  return merged;
}
function trimNeutralBoundaries(text, start, end) {
  while (start < end) {
    const character = text.slice(start).match(/^./su)?.[0];
    if (!character || classifyCharacter(character) !== "neutral") break;
    start += character.length;
  }
  while (end > start) {
    const character = text.slice(0, end).match(/.$/su)?.[0];
    if (!character || classifyCharacter(character) !== "neutral") break;
    end -= character.length;
  }
  return { start, end };
}
function segmentDirectionalRuns(text) {
  if (!text) return [];
  const runs = [];
  let currentDirection = null;
  let currentText = "";
  let start = 0;
  let index = 0;
  for (const character of text) {
    const direction = classifyCharacter(character);
    if (currentDirection === null) {
      currentDirection = direction;
      currentText = character;
      start = index;
    } else if (direction === currentDirection) {
      currentText += character;
    } else {
      runs.push({ text: currentText, direction: currentDirection, start, end: index });
      currentDirection = direction;
      currentText = character;
      start = index;
    }
    index += character.length;
  }
  if (currentDirection !== null) {
    runs.push({ text: currentText, direction: currentDirection, start, end: index });
  }
  return mergeAdjacent(resolveNeutralRuns(runs));
}
function planInlineIsolation(text, blockDirection, options = {}) {
  if (!needsBidiIntervention(text, {
    intervention: options.intervention,
    inheritedDirection: blockDirection
  })) return [];
  const technical = options.excludeTechnicalTokens === false ? [] : findTechnicalTokenRanges(text);
  const isolations = technical.map((range) => ({
    text: range.text,
    direction: "ltr",
    start: range.start,
    end: range.end,
    kind: range.kind
  }));
  if (options.isolateOppositeRuns === false) {
    return attachSourceRanges(text, isolations.sort((a, b) => a.start - b.start));
  }
  let technicalIndex = 0;
  for (const run of segmentDirectionalRuns(text)) {
    if (run.direction === "neutral" || run.direction === blockDirection) continue;
    while (technicalIndex < technical.length && technical[technicalIndex].end <= run.start) {
      technicalIndex += 1;
    }
    let cursor = run.start;
    for (let index = technicalIndex; index < technical.length; index += 1) {
      const range = technical[index];
      if (range.end <= cursor) continue;
      if (range.start >= run.end) break;
      const partEnd = Math.min(range.start, run.end);
      if (cursor < partEnd) {
        const trimmed = trimNeutralBoundaries(text, cursor, partEnd);
        if (trimmed.start < trimmed.end) isolations.push({
          text: text.slice(trimmed.start, trimmed.end),
          direction: run.direction,
          start: trimmed.start,
          end: trimmed.end,
          kind: "opposite-direction-run"
        });
      }
      cursor = Math.max(cursor, range.end);
      if (cursor >= run.end) break;
    }
    if (cursor < run.end) {
      const trimmed = trimNeutralBoundaries(text, cursor, run.end);
      if (trimmed.start < trimmed.end) isolations.push({
        text: text.slice(trimmed.start, trimmed.end),
        direction: run.direction,
        start: trimmed.start,
        end: trimmed.end,
        kind: "opposite-direction-run"
      });
    }
  }
  return attachSourceRanges(text, isolations.sort((a, b) => a.start - b.start || a.end - b.end));
}

// packages/html/src/index.ts
var SAFE_TAG = /^[a-z][a-z0-9-]*$/u;
var SAFE_BLOCK_TAGS = /* @__PURE__ */ new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "dd",
  "div",
  "dt",
  "figcaption",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "li",
  "main",
  "nav",
  "p",
  "pre",
  "section",
  "span",
  "td",
  "th"
]);
var SAFE_CONTAINER_TAGS = /* @__PURE__ */ new Set([
  "article",
  "aside",
  "blockquote",
  "div",
  "footer",
  "header",
  "main",
  "nav",
  "section",
  "span"
]);
function escapeHtml(value) {
  return value.replace(/[&<>"']/gu, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character] ?? character);
}
function checkedTag(value, option, allowed) {
  const normalized = value.toLowerCase();
  if (!SAFE_TAG.test(normalized) || !allowed.has(normalized)) {
    throw new Error(`${option} must be an allowed non-executable HTML container tag.`);
  }
  return normalized;
}
function classAttribute(value) {
  return value ? ` class="${escapeHtml(value)}"` : "";
}
function renderInlineBidiHtml(source, direction, options = {}) {
  const includeData = options.includeDataAttributes ?? true;
  const isolations = planInlineIsolation(source, direction, { intervention: options.intervention });
  let html = "";
  let cursor = 0;
  for (const isolation of isolations) {
    html += escapeHtml(source.slice(cursor, isolation.start));
    const tag = isolation.kind === "code" ? "code" : "bdi";
    const data = includeData ? ` data-bidilens-isolate="" data-bidilens-kind="${isolation.kind}"${isolation.kind === "code" ? ' data-bidilens-code=""' : ""}` : "";
    html += `<${tag} dir="${isolation.direction}"${data}>${escapeHtml(isolation.text)}</${tag}>`;
    cursor = isolation.end;
  }
  return html + escapeHtml(source.slice(cursor));
}
function renderBidiHtml(source, options = {}) {
  const detection = { ...options, fallback: options.fallback ?? "ltr" };
  const analysis = analyzeText(source, detection);
  const blockTag = checkedTag(options.blockTag ?? "p", "blockTag", SAFE_BLOCK_TAGS);
  const includeData = options.includeDataAttributes ?? true;
  const intervene = analysis.paragraphs.some((paragraph) => paragraph.direction === "rtl") || needsBidiIntervention(source, {
    intervention: options.intervention,
    inheritedDirection: options.inheritedDirection
  });
  const blocks = analysis.paragraphs.map((paragraph) => {
    const direction = paragraph.direction === "neutral" ? options.inheritedDirection ?? "ltr" : paragraph.direction;
    const data = intervene && includeData ? ' data-bidilens-block=""' : "";
    const directionAttribute = intervene ? ` dir="${direction}"` : "";
    const blockClass = classAttribute(options.blockClassName);
    const inline = intervene ? renderInlineBidiHtml(paragraph.text, direction, {
      includeDataAttributes: includeData,
      intervention: options.intervention
    }) : escapeHtml(paragraph.text);
    const html2 = `<${blockTag}${directionAttribute}${data}${blockClass}>${inline}</${blockTag}>`;
    return { text: paragraph.text, html: html2, direction, start: paragraph.start, end: paragraph.end };
  });
  const serializedBlocks = blocks.map((block, index) => {
    const next = blocks[index + 1];
    const separator = next ? source.slice(block.end, next.start) : "";
    return `${block.html}${escapeHtml(separator)}`;
  }).join("");
  const automaticContainer = blocks.length > 1 ? "div" : false;
  const container = options.containerTag === void 0 ? automaticContainer : options.containerTag;
  const html = container === false ? serializedBlocks : (() => {
    const tag = checkedTag(container, "containerTag", SAFE_CONTAINER_TAGS);
    const data = intervene && includeData ? ' data-bidilens-document=""' : "";
    const containerClass = classAttribute(options.containerClassName);
    return `<${tag}${data}${containerClass}>${serializedBlocks}</${tag}>`;
  })();
  return { source, html, analysis, blocks };
}

// packages/cli/src/index.ts
var import_meta = {};
var SUPPORTED_EXTENSIONS = /* @__PURE__ */ new Set([
  ".md",
  ".mdx",
  ".txt",
  ".html",
  ".htm",
  ".json",
  ".yaml",
  ".yml",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".css",
  ".scss",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".swift",
  ".c",
  ".cc",
  ".cpp",
  ".h",
  ".hpp",
  ".toml",
  ".vue",
  ".svelte",
  ".astro",
  ".dart",
  ".xml",
  ".svg",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".cs",
  ".fs",
  ".fsx",
  ".vb",
  ".rb",
  ".php",
  ".sql",
  ".ini",
  ".conf",
  ".properties",
  ".gradle",
  ".groovy",
  ".lua",
  ".pl",
  ".r",
  ".ex",
  ".exs",
  ".erl",
  ".hrl"
]);
var SUPPORTED_BASENAMES = /* @__PURE__ */ new Set([
  "dockerfile",
  "makefile",
  "gemfile",
  "podfile",
  "rakefile",
  "cmakelists.txt",
  "build",
  "workspace",
  ".env"
]);
var IGNORED_DIRECTORIES = /* @__PURE__ */ new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  "test-results",
  "playwright-report",
  ".vite",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".output"
]);
var RISK_ORDER = { low: 1, medium: 2, high: 3 };
function createRuntime(runtime) {
  return {
    cwd: (0, import_node_path2.resolve)(runtime.cwd ?? import_node_process2.default.cwd()),
    stdout: runtime.stdout ?? ((value) => import_node_process2.default.stdout.write(value)),
    stderr: runtime.stderr ?? ((value) => import_node_process2.default.stderr.write(value)),
    exitCode: 0
  };
}
function line(writer, value = "") {
  writer(`${value}
`);
}
async function collectFiles(inputs, cwd) {
  const files = [];
  async function visitPath(input2, explicitlyNamed) {
    const absolute = (0, import_node_path2.resolve)(cwd, input2);
    const info = await (0, import_promises.lstat)(absolute);
    if (info.isSymbolicLink()) return;
    if (info.isDirectory()) {
      const entries = await (0, import_promises.readdir)(absolute, { withFileTypes: true });
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (IGNORED_DIRECTORIES.has(entry.name.toLowerCase())) continue;
        if (entry.isSymbolicLink()) continue;
        await visitPath((0, import_node_path2.resolve)(absolute, entry.name), false);
      }
      return;
    }
    const name = (0, import_node_path2.basename)(absolute).toLowerCase();
    const supportedName = SUPPORTED_BASENAMES.has(name) || name.startsWith(".env.");
    if (info.isFile() && (explicitlyNamed || supportedName || SUPPORTED_EXTENSIONS.has((0, import_node_path2.extname)(absolute).toLowerCase()))) {
      files.push(absolute);
    }
  }
  for (const input2 of inputs) await visitPath(input2, true);
  return files.sort((a, b) => a.localeCompare(b));
}
async function readCorpus(cwd, explicitPath) {
  const candidates = explicitPath ? [(0, import_node_path2.resolve)(cwd, explicitPath)] : [
    (0, import_node_path2.resolve)(cwd, "corpus/cases.json"),
    new URL("../corpus/cases.json", import_meta.url),
    new URL("../../../corpus/cases.json", import_meta.url)
  ];
  let lastError;
  for (const candidate of candidates) {
    try {
      return JSON.parse(await (0, import_promises.readFile)(candidate, "utf8"));
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Unable to locate corpus/cases.json. Pass --corpus <path>. ${String(lastError)}`);
}
function parseRisk(value) {
  if (value === "low" || value === "medium" || value === "high") return value;
  throw new Error(`Invalid risk level: ${value}`);
}
function parseSecurityMode(value) {
  if (value === "off" || value === "audit" || value === "warn" || value === "strict") return value;
  throw new Error(`Invalid security mode: ${value}`);
}
function parseIntervention(value) {
  if (value === "auto" || value === "always") return value;
  throw new Error(`Invalid intervention mode: ${value}`);
}
function riskForFinding(finding) {
  if (finding.severity === "high") return "high";
  if (finding.severity === "warning") return "medium";
  return "low";
}
function highestFindingRisk(findings) {
  if (findings.some((finding) => finding.severity === "high")) return "high";
  if (findings.some((finding) => finding.severity === "warning")) return "medium";
  if (findings.length) return "low";
  return null;
}
function sourcePosition(text, utf16Offset) {
  let lineNumber = 1;
  let lineStart = 0;
  const newline = /\r\n|\n|\r/gu;
  let match;
  while ((match = newline.exec(text)) !== null && match.index < utf16Offset) {
    lineNumber += 1;
    lineStart = match.index + match[0].length;
  }
  return { line: lineNumber, column: utf16Offset - lineStart + 1 };
}
function artifactUri(file, cwd) {
  const local = (0, import_node_path2.relative)(cwd, file);
  if (local && !local.startsWith("..") && !(0, import_node_path2.resolve)(local).startsWith("..")) return local.replaceAll("\\", "/");
  return (0, import_node_url.pathToFileURL)(file).href;
}
function sarifForReports(reports, cwd) {
  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{
      columnKind: "utf16CodeUnits",
      tool: { driver: { name: "BidiLens", semanticVersion: "0.1.0" } },
      results: reports.flatMap((report) => report.findings.map((finding) => {
        const start = sourcePosition(report.text, finding.sourceRange.utf16.start);
        const end = sourcePosition(report.text, finding.sourceRange.utf16.end);
        return {
          ruleId: finding.code,
          level: finding.severity === "high" ? "error" : finding.severity === "warning" ? "warning" : "note",
          message: { text: `${finding.message} ${finding.remediation}` },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: artifactUri(report.file, cwd) },
              region: {
                startLine: start.line,
                startColumn: start.column,
                endLine: end.line,
                endColumn: end.column
              }
            }
          }]
        };
      }))
    }]
  };
}
function createCliProgram(state) {
  const program2 = new Command();
  program2.name("bidilens").description("Inspect and secure mixed bidirectional text").version("0.1.0").exitOverride().configureOutput({ writeOut: state.stdout, writeErr: state.stderr });
  program2.command("inspect").description("Analyze a string or file").option("-t, --text <text>", "text to inspect").option("-f, --file <path>", "file to inspect").option("--json", "emit JSON").action(async (options) => {
    if (!options.text && !options.file) throw new Error("Provide --text or --file.");
    const text = options.file ? await (0, import_promises.readFile)((0, import_node_path2.resolve)(state.cwd, options.file), "utf8") : options.text;
    const analysis = analyzeText(text, { strategy: "content-majority", fallback: "neutral" });
    const controls = findBidiControls(text);
    const report = { analysis, controls, visible: controls.length ? visibleBidiControls(text) : text };
    if (options.json) line(state.stdout, JSON.stringify(report, null, 2));
    else {
      line(state.stdout, `Direction: ${analysis.direction}`);
      line(state.stdout, `Confidence: ${analysis.confidence}`);
      line(state.stdout, `Strong characters: RTL ${analysis.counts.rtl}, LTR ${analysis.counts.ltr}`);
      line(state.stdout, `Paragraphs: ${analysis.paragraphs.length}`);
      line(state.stdout, `Bidi controls: ${controls.length}`);
      if (controls.length) line(state.stdout, report.visible);
    }
  });
  program2.command("render").description("Render plain text as escaped, semantic direction-aware HTML").option("-t, --text <text>", "text to render").option("-f, --file <path>", "file to render").option("--intervention <mode>", "auto or always", parseIntervention, "auto").option("--json", "emit analysis and HTML as JSON").action(async (options) => {
    if (!options.text && !options.file) throw new Error("Provide --text or --file.");
    const text = options.file ? await (0, import_promises.readFile)((0, import_node_path2.resolve)(state.cwd, options.file), "utf8") : options.text;
    const result = renderBidiHtml(text, { intervention: options.intervention });
    line(state.stdout, options.json ? JSON.stringify({ analysis: result.analysis, html: result.html }, null, 2) : result.html);
  });
  program2.command("audit").aliases(["security-scan", "lint"]).description("Audit files for hidden and unbalanced bidi controls").argument("<paths...>", "files or directories").option("--json", "emit JSON").option("--sarif", "emit SARIF 2.1.0").option("--mode <mode>", "off, audit, warn, or strict", parseSecurityMode, "audit").option("--fail-on <risk>", "minimum risk that exits non-zero", parseRisk, "high").action(async (paths, options) => {
    if (options.json && options.sarif) throw new Error("Choose either --json or --sarif, not both.");
    const files = await collectFiles(paths, state.cwd);
    const reports = [];
    let shouldFail = false;
    for (const file of files) {
      const text = await (0, import_promises.readFile)(file, "utf8");
      const security = scanBidiSecurity(text, { mode: options.mode });
      if (!security.findings.length) continue;
      const highestRisk = highestFindingRisk(security.findings);
      reports.push({ file, text, findings: security.findings, highestRisk });
      if (security.shouldBlock || highestRisk && RISK_ORDER[highestRisk] >= RISK_ORDER[options.failOn]) shouldFail = true;
    }
    if (options.sarif) line(state.stdout, JSON.stringify(sarifForReports(reports, state.cwd), null, 2));
    else if (options.json) {
      line(state.stdout, JSON.stringify({
        scanned: files.length,
        reports: reports.map((report) => ({
          file: report.file,
          findings: report.findings,
          highestRisk: report.highestRisk
        }))
      }, null, 2));
    } else if (!reports.length) line(state.stdout, `No bidi security findings in ${files.length} files.`);
    else {
      for (const report of reports) {
        line(state.stdout, `
${report.file} (${report.highestRisk ?? "unknown"})`);
        for (const finding of report.findings) {
          const position = sourcePosition(report.text, finding.sourceRange.utf16.start);
          line(state.stdout, `  ${finding.code} at ${position.line}:${position.column} [${riskForFinding(finding)}] ${finding.message}`);
        }
      }
    }
    if (shouldFail) state.exitCode = Math.max(state.exitCode, 2);
  });
  program2.command("test").description("Run the direction conformance corpus").option("--json", "emit failures as JSON").option("--corpus <path>", "corpus JSON path; defaults to the bundled corpus or repository corpus").action(async (options) => {
    const corpus = await readCorpus(state.cwd, options.corpus);
    const failures = corpus.flatMap((item) => {
      const actual = analyzeText(item.text, { strategy: "content-majority", fallback: "neutral" }).direction;
      return actual === item.expected ? [] : [{ id: item.id, expected: item.expected, actual }];
    });
    if (options.json) line(state.stdout, JSON.stringify({ total: corpus.length, failures }, null, 2));
    else line(state.stdout, `Corpus: ${corpus.length - failures.length}/${corpus.length} passed`);
    if (failures.length) state.exitCode = Math.max(state.exitCode, 1);
  });
  program2.command("sanitize").description("Remove bidi controls from one file").argument("<file>", "input file").option("-o, --output <path>", "output path; defaults to stdout").option("--keep-low", "preserve low-risk ALM/LRM/RLM marks").action(async (file, options) => {
    const text = await (0, import_promises.readFile)((0, import_node_path2.resolve)(state.cwd, file), "utf8");
    const remove = options.keepLow ? ["high", "medium"] : ["high", "medium", "low"];
    const result = sanitizeBidiControls(text, { remove });
    if (options.output) {
      const output = (0, import_node_path2.resolve)(state.cwd, options.output);
      await (0, import_promises.writeFile)(output, result.text, "utf8");
      line(state.stderr, `Removed ${result.removed.length} controls and wrote ${output}.`);
    } else {
      state.stdout(result.text);
    }
  });
  return program2;
}
async function runCli(argv = import_node_process2.default.argv, runtime = {}) {
  const state = createRuntime(runtime);
  const program2 = createCliProgram(state);
  try {
    await program2.parseAsync([...argv], { from: "node" });
  } catch (error) {
    if (error instanceof CommanderError) return Math.max(state.exitCode, error.exitCode);
    const message = error instanceof Error ? error.message : String(error);
    line(state.stderr, `bidilens: ${message}`);
    return Math.max(state.exitCode, 1);
  }
  return state.exitCode;
}

// action/src/index.ts
function input(env, name) {
  return env[`INPUT_${name.toUpperCase()}`]?.trim() ?? "";
}
function choice(name, value, fallback, allowed) {
  const candidate = value || fallback;
  if (!allowed.includes(candidate)) {
    throw new Error(`${name} must be one of ${allowed.join(", ")}; received ${JSON.stringify(candidate)}.`);
  }
  return candidate;
}
function readActionInputs(env = import_node_process3.default.env) {
  return {
    command: choice("command", input(env, "COMMAND"), "audit", ["audit", "test"]),
    paths: (input(env, "PATHS") || ".").split(/\r?\n/u).map((path2) => path2.trim()).filter(Boolean),
    corpus: input(env, "CORPUS"),
    mode: choice("mode", input(env, "MODE"), "audit", ["off", "audit", "warn", "strict"]),
    failOn: choice("fail-on", input(env, "FAIL-ON"), "high", ["low", "medium", "high"]),
    format: choice("format", input(env, "FORMAT"), "human", ["human", "json", "sarif"]),
    sarifFile: input(env, "SARIF-FILE") || "bidilens.sarif"
  };
}
function buildCliArguments(inputs, env = import_node_process3.default.env) {
  if (inputs.command === "test") {
    if (inputs.format === "sarif") throw new Error("SARIF output is available only for the audit command.");
    const actionPath = env.GITHUB_ACTION_PATH ? (0, import_node_path3.resolve)(env.GITHUB_ACTION_PATH) : (0, import_node_path3.resolve)(env.GITHUB_WORKSPACE ?? import_node_process3.default.cwd(), "action");
    const corpus = inputs.corpus || (0, import_node_path3.resolve)(actionPath, "..", "corpus", "cases.json");
    return ["node", "bidilens", "test", "--corpus", corpus, ...inputs.format === "json" ? ["--json"] : []];
  }
  const format = inputs.format === "json" ? ["--json"] : inputs.format === "sarif" ? ["--sarif"] : [];
  return [
    "node",
    "bidilens",
    "audit",
    ...inputs.paths,
    "--mode",
    inputs.mode,
    "--fail-on",
    inputs.failOn,
    ...format
  ];
}
function workspaceFile(cwd, requested) {
  const absolute = (0, import_node_path3.resolve)(cwd, requested);
  const local = (0, import_node_path3.relative)(cwd, absolute);
  if (!local || local.startsWith("..") || (0, import_node_path3.isAbsolute)(local)) {
    throw new Error("sarif-file must resolve to a file inside GITHUB_WORKSPACE.");
  }
  return { absolute, relative: local.replaceAll("\\", "/") };
}
async function setOutput(path2, name, value) {
  if (!path2) return;
  const delimiter = `bidilens_${(0, import_node_crypto.randomUUID)()}`;
  await (0, import_promises2.appendFile)(path2, `${name}<<${delimiter}
${value}
${delimiter}
`, "utf8");
}
async function runAction(context = {}) {
  const env = context.env ?? import_node_process3.default.env;
  const cwd = (0, import_node_path3.resolve)(context.cwd ?? env.GITHUB_WORKSPACE ?? import_node_process3.default.cwd());
  const log = context.log ?? console.log;
  const error = context.error ?? console.error;
  const inputs = readActionInputs(env);
  const stdout = [];
  const stderr = [];
  const exitCode = await runCli(buildCliArguments(inputs, env), {
    cwd,
    stdout: (value) => stdout.push(value),
    stderr: (value) => stderr.push(value)
  });
  const stdoutText = stdout.join("");
  const stderrText = stderr.join("");
  let report = "";
  if (inputs.format === "sarif") {
    const target = workspaceFile(cwd, inputs.sarifFile);
    await (0, import_promises2.mkdir)((0, import_node_path3.dirname)(target.absolute), { recursive: true });
    await (0, import_promises2.writeFile)(target.absolute, stdoutText, "utf8");
    report = target.relative;
    log(`BidiLens SARIF report written to ${report}.`);
  } else if (stdoutText) {
    log(stdoutText.trimEnd());
  }
  if (stderrText) error(stderrText.trimEnd());
  await setOutput(env.GITHUB_OUTPUT, "exit-code", String(exitCode));
  await setOutput(env.GITHUB_OUTPUT, "report", report);
  if (exitCode !== 0) error(`BidiLens ${inputs.command} failed with exit code ${exitCode}.`);
  return { exitCode, report, stdout: stdoutText, stderr: stderrText };
}
function workflowError(message) {
  const escaped = message.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
  return `::error title=BidiLens::${escaped}`;
}

// action/src/main.ts
async function main() {
  try {
    const result = await runAction();
    import_node_process4.default.exitCode = result.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    import_node_process4.default.stderr.write(`${workflowError(message)}
`);
    import_node_process4.default.exitCode = 1;
  }
}
void main();
//# sourceMappingURL=index.cjs.map
