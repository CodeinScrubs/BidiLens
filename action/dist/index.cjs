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

// packages/core/src/unicode-ranges.ts
function decodeRangeDeltas(encoded) {
  if (!encoded) return [];
  const deltas = encoded.split(",");
  const ranges = new Array(deltas.length);
  let previousEnd = -1;
  for (let index = 0; index < deltas.length; index += 2) {
    const start = previousEnd + 1 + Number.parseInt(deltas[index], 36);
    const end = start + Number.parseInt(deltas[index + 1], 36);
    ranges[index] = start;
    ranges[index + 1] = end;
    previousEnd = end;
  }
  return ranges;
}
function containsCodePoint(ranges, codePoint) {
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

// packages/core/src/generated/bidi-ranges.ts
var RTL_BIDI_RANGES = decodeRangeDeltas("13k,0,19,0,1,0,2,0,2,0,1,1j,8,0,2,0,1,0,d,1b,y,2,1,2s,f,1,7,1,a,m,1,t,r,2i,b,1l,9,1,4,2,1,n,4,0,9,0,3,0,5,16,3,1f,2,4,9,15,4lh,0,179p,0,1,9,1,48,g,a2,i,1r,2,1h,14,c,37,3y,1s1,7y,1,68,3,0,2,4,4,13,3,3,1,4k,2,29,7,df,4,7,a,5,a,u,6,6o,v,17,2,y,9,w,6,1x,b,1c,4,3d,16o0,5r,7,30,7,144,2,7h");
var NON_STRONG_BIDI_RANGES = decodeRangeDeltas("0,1s,q,5,q,1a,1,9,1,3,1,4,n,0,v,0,ch,1,7,d,2,d,5,8,1,3k,4,1,8,0,5,1,1,0,32,0,3w,6,74,0,2,2,1,18,1,0,1,1,1,1,1,0,1k,7,1,1,1,0,1,c,1c,x,3,0,2t,e,2,6,2,9,n,0,u,q,2j,a,1m,8,2,3,3,0,o,3,1,8,1,2,1,4,17,2,1g,1,5,8,16,1k,1j,0,1,0,4,7,4,0,3,6,a,1,t,0,1m,0,4,3,8,0,k,1,e,1,7,0,2,0,2,1,1l,0,4,1,4,1,2,2,3,0,u,1,3,0,b,1,1l,0,4,4,1,1,4,0,k,1,d,0,8,5,1,0,1m,0,2,0,1,3,8,0,7,1,b,1,u,0,1p,0,c,0,11,7,5,0,3,0,1j,0,1,2,5,2,1,3,7,1,b,1,k,6,2,0,1m,0,f,1,k,1,s,1,1l,1,4,3,8,0,k,1,t,0,20,0,7,2,1,0,2i,0,2,6,4,0,7,7,2q,0,2,8,b,6,21,1,r,0,1,0,1,4,1f,d,1,4,1,1,5,a,1,z,9,0,2u,3,1,5,1,1,2,1,p,1,4,2,g,3,d,0,2,1,6,0,f,0,jj,2,1c,9,2u,0,hr,0,q,1,39,2,t,1,u,1,u,1,1s,1,1,6,8,0,2,a,7,0,1,0,i,9,6,f,39,1,y,0,3a,2,4,1,9,0,6,2,4,0,3,1,48,x,n,1,2,0,1m,0,1,6,1,0,1,0,2,7,6,9,2,0,1c,19,2,b,k,3,1c,0,1,4,1,0,5,0,14,8,c,1,w,3,2,1,1,2,1k,0,1,1,3,0,1,2,1m,7,2,1,48,2,1,c,1,6,4,0,6,0,3,1,5i,1r,cd,0,1,2,b,2,d,2,d,2,d,1,1,d,2,2o,3,a,1,e,h,28,f,1,1,3,1,1,a,0,1,2,5,5,1,0,1,0,1,0,4,0,b,1,4,4,5,3,2,f,15,2,4,bp,1x,p,1,43,m,a,l,1n,26,ch,1,9e,74,hf,2,3t,6d,5,4,2,7,6,3j,0,2o,3h,y,p,1,2g,c,5x,q,k,3,o,9,3,2,0,5,1,5,2,2h,3,3,0,2i,0,5g,11,9,0,19,1,1d,f,s,2,1e,e,c,3,4n,3,2r,1,v,0,534,1r,h3k,1i,92,2,2n,g,u,1,28,1,e,x,2u,0,3d,0,3,0,4,0,p,1,1,4,b,1,1m,3,24,1,q,h,d,0,12,7,p,a,1a,2,1c,0,2,3,2,1,13,0,1v,5,2,1,2,1,c,0,8,0,1b,0,1f,0,1,2,2,1,5,1,1,0,16,1,8,0,37,1,3d,0,2,0,4,0,fn4,0,a,0,49,f,a3,h,1s,1,1i,13,d,s,6,1e,1,i,1,3,43,0,1,v,q,5,q,a,3e,6,1,6,1,f,75,0,1q,24,3,c,3,0,2k,0,6a,r,3e,4,144,0,69,2,1,1,5,3,14,2,4,0,4l,1,2a,6,dg,3,8,9,6,9,v,5,6p,u,18,1,z,8,x,5,1y,a,1d,3,3f,0,1i,e,b,j,a,0,2,1,a,2,1d,3,2,1,7,0,1p,2,10,4,1,7,1q,0,c,1,1g,8,a,3,2,0,2n,2,2,0,1,1,6,0,2,0,4d,0,3,7,l,1,1l,1,3,0,11,6,3,4,1y,5,d,0,1,0,1,0,e,1,2d,7,2,2,1,0,n,0,2c,5,1,0,4,1,1,1,6m,3,6,1,1,1,r,1,2d,7,2,0,1,1,v,c,1q,0,1,0,2,5,1,0,2t,0,1,0,2,3,1,4,77,8,1,1,74,1,1,0,4,0,40,3,2,1,4,0,w,5,2,1,14,5,2,3,8,0,9,5,2,2,1a,c,1,1,5i,0,1,2,1,0,5l,6,1,5,2c,l,2,6,1,1,1,1,3e,5,3,0,1,1,1,6,1,0,20,1,3,0,1,0,9n,1,b,1,1g,4,5,0,1,0,n,0,3e,s,40e,0,6,e,8ug,b,3,2,1xc,4,1n,6,t4,0,1r,3,27,0,1,0,f5k,1,1,3,318,5x,q,c,3,c3,6,m,f,g,f,19,2,m,f4,2,9,f,2,6,u,3,1n,1,l,1x,56,2e,oa,0,p,0,v,0,p,0,v,0,p,0,v,0,p,0,v,0,p,0,a,1d,e8,1i,4,1d,8,0,e,0,m,4,1,e,11s,6,1,g,2,6,1,1,1,4,2s,0,4g,6,af,0,1p,3,f,0,do,3,72,1,6r,0,2,0,7,1,5,0,d6,6,31,6,145,1,7i,17,4,2r,c,e,2,e,1,e,1,10,a,f,v,0,1m,5,1p,0,4y,5,4a,rc,3,g,3,c,3,61,6,b,4,0,f,b,4,1j,8,9,6,13,8,t,2,b,4,1,e,8,13,9j,8,d,2,c,3,a,3,1k,1,0,4,f,2,b,4,9,7,42,1,2u,sj,1,1eke,1,1eke,1,1eke,1,1eke,1,1eke,1,1eke,1,1eke,1,1eke,1,1eke,1,1eke,1,1eke,1,1eke,35t,1bem,1,1eke,1,1eke,1");
var NATURAL_LETTER_RANGES = decodeRangeDeltas("1t,p,6,p,1b,0,a,0,4,0,5,m,1,u,1,cp,4,b,e,4,7,0,1,0,3l,4,1,1,2,3,1,0,6,0,1,2,1,0,1,j,1,2a,1,3u,8,4l,1,11,2,0,6,14,1z,q,4,3,19,16,z,1,1,2q,1,0,f,1,7,1,a,2,2,0,g,0,1,t,t,2g,b,0,o,w,9,1,4,0,5,l,4,0,9,0,3,0,n,o,7,a,5,n,1,6,g,15,1m,1h,3,0,i,0,7,9,f,f,4,7,2,1,2,l,1,6,1,0,3,3,3,0,g,0,d,1,1,2,e,1,a,0,8,5,4,1,2,l,1,6,1,1,1,1,1,1,v,3,1,0,j,2,g,8,1,2,1,l,1,6,1,1,1,4,3,0,i,0,f,1,n,0,b,7,2,1,2,l,1,6,1,1,1,4,3,0,u,1,1,2,f,0,h,0,1,5,3,2,1,3,3,1,1,0,1,1,3,1,3,2,3,b,m,0,1g,7,1,2,1,m,1,f,3,0,q,2,1,1,2,1,u,0,4,7,1,2,1,m,1,9,1,4,3,0,u,2,1,1,f,1,h,8,1,2,1,14,2,0,g,0,5,2,8,2,o,5,5,h,3,n,1,8,1,0,2,6,1m,1b,1,1,c,6,1m,1,1,0,1,4,1,n,1,0,1,9,1,1,9,0,2,4,1,0,l,3,w,0,1r,7,1,z,r,4,37,16,k,0,g,5,4,3,3,0,3,1,7,2,4,c,c,0,h,11,1,0,5,0,2,16,1,98,1,3,2,6,1,0,1,3,2,14,1,3,2,w,1,3,2,6,1,0,1,3,2,e,1,1k,1,3,2,1u,11,f,g,2d,2,5,3,h7,2,g,1,p,5,22,6,7,7,h,d,i,e,h,e,c,1,2,f,1f,z,0,4,0,1v,2g,7,4,2,x,1,0,5,1x,a,u,1d,t,2,4,b,17,4,p,1i,m,9,1g,2a,0,2l,1a,h,7,1i,t,d,1,a,17,q,z,15,2,a,z,2,a,5,16,2,2,15,3,1,5,1,1,3,0,5,5b,1s,7p,2,5,2,11,2,5,2,7,1,0,1,0,1,0,1,u,2,1g,1,6,1,0,3,2,1,6,3,3,2,5,4,c,5,2,1,6,38,0,d,0,g,c,2t,0,4,0,2,9,1,0,3,4,6,0,1,0,1,0,1,3,1,a,2,3,5,4,4,0,1g,1,22j,6c,6,3,3,1,c,11,1,0,5,0,2,1j,7,0,g,m,9,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,28,0,d1,1,16,4,5,1,4,2d,6,2,1,2h,1,3,5,16,1,2l,h,v,1c,f,e8,533,1s,h3g,1v,19,2,7g,3,f,a,1,k,1a,g,u,2,1x,1d,8,2,2u,2,29,k,g,1,2,1,3,1,m,t,1f,e,1d,1q,5,3,0,1,1,b,r,a,m,p,s,7,1a,s,0,g,4,1,9,a,4,1,14,n,2,1,7,k,m,3,0,3,1d,1,0,3,1,2,4,2,0,1,0,o,2,2,a,7,2,c,5,2,5,2,5,9,6,1,6,1,16,1,d,6,36,t,8mb,c,m,4,1c,6is,a5,2,2x,12,6,c,4,5,0,1,9,1,c,1,4,1,0,1,1,1,1,1,2z,x,a2,i,1r,2,1h,14,b,38,4,1,3q,10,p,6,p,b,2g,3,5,2,5,2,5,2,2,z,b,1,p,1,i,1,1,1,e,2,d,y,3e,at,s,3,1c,1b,v,d,j,1,7,6,11,a,t,2,z,4,7,1c,4d,i,z,4,z,4,13,8,1f,c,a,1,e,1,6,1,1,1,a,1,e,1,6,1,1,3,1f,c,8m,9,l,a,7,o,5,1,15,1,8,1x,5,2,0,1,17,1,1,3,0,2,m,a,m,9,u,1t,i,1,1,a,l,a,p,6,p,12,1j,6,1,1s,0,f,3,1,2,1,s,16,s,3,s,z,7,1,r,r,1h,a,l,a,i,d,h,32,20,1j,1e,d,1e,d,z,12,r,9,m,6y,15,6,1,g,5,1k,s,a,0,8,l,16,h,1a,k,r,m,c,1g,1l,1,2,0,d,18,w,o,q,z,t,0,2,0,8,y,3,0,c,1b,e,3,l,0,1,0,z,h,1,o,j,1,1r,6,1,0,1,3,1,e,1,9,7,1a,12,7,2,1,2,l,1,6,1,1,1,4,3,0,i,0,c,4,u,9,1,0,2,0,1,11,1,0,p,0,1,0,18,1g,i,3,k,2,u,1b,k,1,1,0,54,1a,15,3,10,1b,k,0,1n,16,d,0,1z,q,11,6,55,17,38,1r,v,7,2,0,2,7,1,1,1,n,f,0,1,0,2m,7,2,12,g,0,1,0,s,0,a,13,7,0,l,0,b,19,j,0,i,20,5j,w,v,8,1,10,h,0,1d,t,34,6,1,1,1,11,l,0,p,5,1,1,1,v,e,0,n,17,78,i,f,0,1,c,1,x,3g,0,27,pl,6e,5f,218,2o,f,tr,h,5,p,32y,5,g6,5a1,t,1cy,fs,7,u,h,26,h,t,i,1b,g,3,v,k,5,i,c0,18,5v,1r,w,o,2,o,18,22,5,0,1u,c,1s,1,1,0,e,1,c,5p1,15,v,2p,36,6pp,3,1,6,1,1,1,82,f,0,t,2,2,0,e,3,8,az,1s4,2y,5,c,3,8,7,9,4me,2c,1,1y,1,1,2,0,2,1,2,3,1,b,1,0,1,6,1,1s,1,3,2,7,1,6,1,r,1,3,1,4,1,0,3,6,1,9f,2,o,1,o,1,u,1,o,1,u,1,o,1,u,1,o,1,u,1,o,1,7,1f8,u,6,5,79,1p,42,18,a,6,g,0,8x,t,i,17,dg,r,6c,t,2,0,5r,u,1,2,1,1,1,6,2,4,9,1,68,6,1,3,1,1,1,e,1,5g,1n,1v,7,0,xg,3,1,q,1,1,1,0,2,0,1,9,1,3,1,0,1,0,6,0,4,0,1,0,1,0,1,2,1,1,1,0,2,0,1,0,1,0,1,0,1,0,1,1,1,0,2,3,1,6,1,3,1,3,1,0,1,9,1,g,5,2,1,4,1,g,3es,wyn,w,3dp,2,4gd,2,5rk,f,h9,1wi,f1,15u,3t6,5,6jt");
var COMBINING_MARK_RANGES = decodeRangeDeltas("lc,33,7n,6,7b,18,1,0,1,1,1,1,1,0,20,a,1c,k,g,0,2t,6,2,5,2,1,1,3,z,0,u,q,2j,a,1m,8,9,0,o,3,1,8,1,2,1,4,17,2,1n,8,16,n,1,w,1i,2,1,h,1,6,a,1,t,2,1k,0,1,6,2,1,2,2,9,0,a,1,q,0,2,2,1k,0,1,4,4,1,2,2,3,0,u,1,3,0,b,2,1k,0,1,7,1,2,1,2,k,1,m,5,1,2,1k,0,1,6,2,1,2,2,7,2,a,1,u,0,1n,4,3,2,1,3,9,0,14,4,1j,0,1,6,1,2,1,3,7,1,b,1,t,2,1k,0,1,6,1,2,1,3,7,1,b,1,f,0,c,3,1j,1,1,6,1,2,1,3,9,0,a,1,t,2,1y,0,4,5,1,0,1,7,i,1,1p,0,2,6,c,7,2q,0,2,8,b,6,21,1,r,0,1,0,1,0,4,1,1d,j,1,1,5,a,1,z,9,0,2s,j,n,3,4,2,1,2,2,6,3,3,d,b,1,0,a,3,jj,2,qa,3,s,2,t,1,u,1,1s,v,9,0,19,2,1,0,39,1,y,0,3a,b,4,b,63,4,1l,9,1,s,2,0,1c,19,2,b,k,4,1b,g,12,8,c,2,u,c,1k,d,1c,j,48,2,1,k,4,0,6,0,2,2,5i,1r,k0,w,2da,2,3x,0,2o,v,fe,5,2x,1,n9w,3,1,9,w,1,28,1,7k,0,3,0,4,0,n,4,4,0,2b,1,1e,h,q,h,d,0,12,7,p,c,18,3,1b,d,10,0,1v,d,c,0,8,1,19,2,1e,0,1,2,2,1,5,1,1,0,15,4,5,1,6k,7,1,1,fn4,0,kh,f,g,f,r1,0,6a,0,45,4,1ae,2,1,1,5,3,14,2,4,0,4l,1,fx,3,1t,4,8t,1,25,5,1y,a,1d,3,3e,2,1h,e,15,0,2,1,a,3,19,a,7,0,1p,2,10,d,g,1,18,0,c,2,1c,d,8,3,1,1,2k,b,6,0,2,0,4d,b,l,3,1j,1,1,6,2,1,2,2,9,0,a,1,2,6,3,4,1v,8,1,0,2,0,1,3,1,4,1,0,e,1,2a,h,n,0,29,j,6j,6,2,8,r,1,2a,g,2y,c,2t,e,74,e,6t,5,1,1,2,3,1,0,1,1,3x,6,2,6,3,0,s,9,14,6,1,3,8,0,9,a,1a,f,5i,7,5j,7,1,7,2a,l,1,d,3e,5,3,0,1,1,1,6,1,0,1u,4,1,1,1,4,9n,3,9,1,1,0,1c,6,3,4,n,0,44l,0,6,e,8ug,h,1xc,4,1n,6,t4,0,1,1i,7,3,29,0,b,1,f57,1,3mp,19,2,m,f2,4,3,5,8,7,2,6,u,3,44,2,1iz,1i,4,1d,8,0,e,0,m,4,1,e,11s,6,1,g,2,6,1,1,1,4,2s,0,4g,6,af,0,1p,3,e4,3,72,1,6r,0,2,0,7,1,5,0,d6,6,31,6,gzhx,6n");

// packages/core/src/classify.ts
function isRtlCodePoint(codePoint) {
  return containsCodePoint(RTL_BIDI_RANGES, codePoint);
}
function classifyBidiStrongCharacter(character) {
  const codePoint = character.codePointAt(0);
  if (codePoint === void 0 || containsCodePoint(NON_STRONG_BIDI_RANGES, codePoint)) return "neutral";
  return isRtlCodePoint(codePoint) ? "rtl" : "ltr";
}
function classifyCharacter(character) {
  const codePoint = character.codePointAt(0);
  if (codePoint === void 0) return "neutral";
  return containsCodePoint(NATURAL_LETTER_RANGES, codePoint) ? classifyBidiStrongCharacter(character) : "neutral";
}

// packages/core/src/options.ts
function boundedNumberOption(name, value, defaultValue, minimum, maximum) {
  const resolved = value ?? defaultValue;
  if (!Number.isFinite(resolved)) {
    throw new RangeError(`${name} must be a finite number.`);
  }
  return Math.min(maximum, Math.max(minimum, resolved));
}

// packages/core/src/paragraph.ts
var DEFAULT_PARAGRAPH_SEPARATOR_SOURCE = "\\r\\n|\\n|\\r|\\u0085|[\\u001C-\\u001E]|\\u2029";

// packages/core/src/detect.ts
var DEFAULT_OPTIONS = {
  strategy: "content-majority",
  fallback: "neutral",
  inheritedDirection: "ltr",
  minimumStrongCharacters: 1,
  majorityThreshold: 0.5,
  excludeTechnicalTokens: true,
  technicalIdentifiers: []
};
var DEFAULT_TECHNICAL_IDENTIFIERS = Object.freeze([
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
  "yaml",
  "angular",
  "astro",
  "chrome",
  "docker",
  "esbuild",
  "eslint",
  "firefox",
  "kubernetes",
  "kubectl",
  "nuxt",
  "playwright",
  "pnpm",
  "preact",
  "remix",
  "rollup",
  "safari",
  "stencil",
  "storybook",
  "tailwind",
  "turbopack",
  "vite",
  "vitest"
]);
var KNOWN_TECHNICAL_TOKENS = new Set(DEFAULT_TECHNICAL_IDENTIFIERS);
var CUSTOM_TECHNICAL_IDENTIFIER_CACHE = /* @__PURE__ */ new WeakMap();
function normalizeOptions(options = {}) {
  const strategy = options.strategy ?? DEFAULT_OPTIONS.strategy;
  const majorityStrategy = strategy === "content-majority" || strategy === "semantic-dominant" || strategy === "majority";
  return {
    strategy,
    fallback: options.fallback ?? options.inheritedDirection ?? DEFAULT_OPTIONS.fallback,
    inheritedDirection: options.inheritedDirection ?? DEFAULT_OPTIONS.inheritedDirection,
    minimumStrongCharacters: boundedNumberOption(
      "minimumStrongCharacters",
      options.minimumStrongCharacters,
      DEFAULT_OPTIONS.minimumStrongCharacters,
      1,
      Number.POSITIVE_INFINITY
    ),
    majorityThreshold: boundedNumberOption(
      "majorityThreshold",
      options.majorityThreshold,
      DEFAULT_OPTIONS.majorityThreshold,
      0.5,
      1
    ),
    // Compatibility/strict first-strong modes must see the real first strong
    // character (including a leading technical identifier), like dir="auto".
    excludeTechnicalTokens: options.excludeTechnicalTokens ?? majorityStrategy,
    technicalIdentifiers: options.technicalIdentifiers ?? DEFAULT_OPTIONS.technicalIdentifiers
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
function addMathRanges(text, ranges) {
  let i = 0;
  let scanned = -1;
  while (i < text.length) {
    const p = text[i] === "\\" && text[i + 1] === "(";
    const d = text[i] === "$" ? text[i + 1] === "$" ? "$$" : "$" : p && i >= scanned ? "\\)" : "";
    if (!d) {
      i++;
      continue;
    }
    let e = i + (p ? 2 : d.length);
    while (e < text.length && text[e] !== "\r" && text[e] !== "\n" && !text.startsWith(d, e)) e++;
    if (text.startsWith(d, e) && (d !== "$" || e > i + 1)) {
      addRange(ranges, text, i, e + d.length, "math");
      i = e + d.length;
    } else {
      if (p) scanned = e;
      i++;
    }
  }
}
function trimTechnicalPunctuation(value) {
  let end = value.length;
  while (end > 0 && /[.,;:!?،؛؟。।۔]/u.test(value[end - 1])) end -= 1;
  return end === value.length ? value : value.slice(0, end);
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
function addCodeRanges(text, ranges) {
  let fence;
  const closedFences = [];
  let lineStart = 0;
  while (lineStart < text.length) {
    let lineEnd = lineStart;
    while (lineEnd < text.length && text[lineEnd] !== "\r" && text[lineEnd] !== "\n") lineEnd += 1;
    let nextLine = lineEnd;
    if (text[nextLine] === "\r") nextLine += 1;
    if (text[nextLine] === "\n") nextLine += 1;
    const line2 = text.slice(lineStart, lineEnd);
    if (!fence) {
      const openerMatch = /^ {0,3}(`{3,}|~{3,})(.*)$/u.exec(line2);
      const opener = openerMatch?.[1];
      const info = openerMatch?.[2] ?? "";
      if (opener && !(opener[0] === "`" && info.includes("`"))) fence = {
        marker: opener[0],
        length: opener.length,
        start: lineStart
      };
    } else {
      const closer = /^ {0,3}(`+|~+)[ \t]*$/u.exec(line2)?.[1];
      if (closer?.[0] === fence.marker && closer.length >= fence.length) {
        closedFences.push({ start: fence.start, end: nextLine });
        fence = void 0;
      }
    }
    lineStart = nextLine;
  }
  let fenceIndex = 0;
  let utf16Index = 0;
  let hasOutsideNaturalText = false;
  for (const character of text) {
    while (fenceIndex < closedFences.length && utf16Index >= closedFences[fenceIndex].end) {
      fenceIndex += 1;
    }
    const span = closedFences[fenceIndex];
    const insideFence = span !== void 0 && utf16Index >= span.start && utf16Index < span.end;
    if (!insideFence && classifyCharacter(character) !== "neutral") {
      hasOutsideNaturalText = true;
      break;
    }
    utf16Index += character.length;
  }
  if (hasOutsideNaturalText) {
    for (const span of closedFences) addRange(ranges, text, span.start, span.end, "code");
  }
  const lineExpression = /[^\r\n]*/gu;
  let lineMatch;
  while ((lineMatch = lineExpression.exec(text)) !== null) {
    const line2 = lineMatch[0];
    const lineStart2 = lineMatch.index;
    const runs = [];
    for (let index = 0; index < line2.length; ) {
      if (line2[index] !== "`") {
        index += 1;
        continue;
      }
      const start = index;
      while (index < line2.length && line2[index] === "`") index += 1;
      runs.push({ start, length: index - start });
    }
    const suffixMaximum = new Array(runs.length + 1).fill(0);
    for (let index = runs.length - 1; index >= 0; index -= 1) {
      suffixMaximum[index] = Math.max(runs[index].length, suffixMaximum[index + 1]);
    }
    let runIndex = 0;
    let cursor = runs[0]?.start ?? 0;
    while (runIndex < runs.length) {
      const opener = runs[runIndex];
      const openerEnd = opener.start + opener.length;
      if (cursor >= openerEnd) {
        runIndex += 1;
        cursor = runs[runIndex]?.start ?? 0;
        continue;
      }
      const available = openerEnd - cursor;
      const delimiterLength = Math.min(
        available,
        Math.max(Math.floor(available / 2), suffixMaximum[runIndex + 1])
      );
      if (delimiterLength === 0) {
        runIndex += 1;
        cursor = runs[runIndex]?.start ?? 0;
        continue;
      }
      let closingRunIndex = runIndex;
      let closingStart = cursor + delimiterLength;
      if (available - delimiterLength < delimiterLength) {
        closingRunIndex += 1;
        while (closingRunIndex < runs.length && runs[closingRunIndex].length < delimiterLength) closingRunIndex += 1;
        if (closingRunIndex >= runs.length) {
          runIndex += 1;
          cursor = runs[runIndex]?.start ?? 0;
          continue;
        }
        closingStart = runs[closingRunIndex].start;
      }
      const end = closingStart + delimiterLength;
      addRange(ranges, text, lineStart2 + cursor, lineStart2 + end, "code");
      runIndex = closingRunIndex;
      cursor = end;
    }
    if (lineMatch[0].length === 0) lineExpression.lastIndex += 1;
  }
}
function customTechnicalIdentifiers(values) {
  const cacheable = Object.isFrozen(values);
  const cached = cacheable ? CUSTOM_TECHNICAL_IDENTIFIER_CACHE.get(values) : void 0;
  if (cached) return cached;
  const identifiers = /* @__PURE__ */ new Set();
  for (const value of values) {
    if (/^[A-Za-z][A-Za-z0-9_.-]*$/u.test(value)) identifiers.add(value.toLowerCase());
  }
  if (cacheable) CUSTOM_TECHNICAL_IDENTIFIER_CACHE.set(values, identifiers);
  return identifiers;
}
var ACRONYM_MAXIMUM_LENGTH = 5;
function isKnownTechnicalWord(value, custom) {
  const normalized = value.toLowerCase();
  return KNOWN_TECHNICAL_TOKENS.has(normalized) || custom.has(normalized);
}
function usesUppercaseProse(text) {
  const words = text.match(/\b[A-Za-z]{2,}\b/gu);
  if (words === null || words.length < 2) return false;
  let capitalized = 0;
  let hasLongCapitalizedWord = false;
  for (const word of words) {
    if (/[a-z]/u.test(word)) continue;
    capitalized += 1;
    if (word.length > ACRONYM_MAXIMUM_LENGTH) hasLongCapitalizedWord = true;
  }
  return hasLongCapitalizedWord && capitalized * 2 > words.length;
}
function isTechnicalIdentifier(token, custom, uppercaseProse) {
  if (isKnownTechnicalWord(token, custom)) return true;
  if (token.includes("-") && token.split("-").some((segment) => segment !== "" && isKnownTechnicalWord(segment, custom))) {
    return true;
  }
  return /[0-9_.]/u.test(token) || /[a-z][A-Z]/u.test(token) || !uppercaseProse && token.length <= ACRONYM_MAXIMUM_LENGTH && /^[A-Z]{2,}$/u.test(token);
}
function findTechnicalTokenRanges(text, technicalIdentifiers = []) {
  const ranges = [];
  addCodeRanges(text, ranges);
  addMatches(text, ranges, /<\/?[A-Za-z][^<>\r\n]*>/gu, "html");
  addMathRanges(text, ranges);
  const urls = /\b(?:https?|ftp):\/\/[^\s<>{}"']+/giu;
  let urlMatch;
  while ((urlMatch = urls.exec(text)) !== null) {
    let value = urlMatch[0];
    value = trimTechnicalPunctuation(value);
    for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
      if (!value.endsWith(close)) continue;
      let balance = 0;
      for (const character of value) {
        if (character === open) balance += 1;
        else if (character === close) balance -= 1;
      }
      if (balance >= 0) continue;
      let end = value.length;
      while (balance < 0 && end > 0 && value[end - 1] === close) {
        balance += 1;
        end -= 1;
      }
      if (end !== value.length) value = value.slice(0, end);
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
  addMatches(text, ranges, /\b[A-Z]{1,4}\s+(?:[IVXLCDM]{1,8}|\d{1,3})\b/gu, "identifier");
  addMatches(text, ranges, /\b[A-Z]{1,4}\/[A-Z]{1,4}\b/gu, "identifier");
  addMatches(text, ranges, /\b[A-Z]\b(?=\s*(?:=|:|→|->))/gu, "identifier");
  const words = /\b[A-Za-z][A-Za-z0-9_.-]*\b/gu;
  const customIdentifiers = customTechnicalIdentifiers(technicalIdentifiers);
  const uppercaseProse = usesUppercaseProse(text);
  let match;
  while ((match = words.exec(text)) !== null) {
    const token = match[0];
    if (isTechnicalIdentifier(token, customIdentifiers, uppercaseProse)) {
      addRange(ranges, text, match.index, match.index + token.length, "identifier");
    }
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
function countStrongCharactersNormalized(text, normalized) {
  const technicalTokens = normalized.excludeTechnicalTokens ? findTechnicalTokenRanges(text, normalized.technicalIdentifiers) : [];
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
function directionFromCounts(counts, normalized) {
  if (normalized.strategy === "ltr" || normalized.strategy === "rtl") return normalized.strategy;
  if (normalized.strategy === "inherit") return normalized.inheritedDirection;
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
function firstBidiStrongCharacter(text) {
  for (const character of text) {
    const direction = classifyBidiStrongCharacter(character);
    if (direction !== "neutral") return direction;
  }
  return "neutral";
}
function splitParagraphs(text) {
  const paragraphs = [];
  const separator = new RegExp(DEFAULT_PARAGRAPH_SEPARATOR_SOURCE, "gu");
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
  const normalized = normalizeOptions(options);
  const countsWithFirst = countStrongCharactersNormalized(text, normalized);
  const counts = {
    ltr: countsWithFirst.ltr,
    rtl: countsWithFirst.rtl,
    total: countsWithFirst.total
  };
  const direction = directionFromCounts(countsWithFirst, normalized);
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
  const normalized = normalizeOptions(options);
  const countsWithFirst = countStrongCharactersNormalized(text, normalized);
  const counts = {
    ltr: countsWithFirst.ltr,
    rtl: countsWithFirst.rtl,
    total: countsWithFirst.total
  };
  const direction = directionFromCounts(countsWithFirst, normalized);
  const rawCountsWithFirst = countStrongCharactersNormalized(text, normalizeOptions({
    ...normalized,
    strategy: "content-majority",
    excludeTechnicalTokens: false
  }));
  const rawCounts = {
    ltr: rawCountsWithFirst.ltr,
    rtl: rawCountsWithFirst.rtl,
    total: rawCountsWithFirst.total
  };
  const split = splitParagraphs(text);
  const paragraphs = split.length === 1 ? [{
    text,
    start: 0,
    end: text.length,
    direction,
    firstStrong: countsWithFirst.firstStrong,
    confidence: confidenceFor(counts, direction),
    counts
  }] : split.map((paragraph) => analyzeParagraph(paragraph.text, paragraph.start, normalized));
  return {
    text,
    direction,
    firstStrong: countsWithFirst.firstStrong,
    rawFirstStrong: firstBidiStrongCharacter(text),
    confidence: confidenceFor(counts, direction),
    counts,
    rawCounts,
    paragraphs,
    mixed: rawCounts.ltr > 0 && rawCounts.rtl > 0
  };
}

// packages/core/src/security.ts
var UAX9_PARAGRAPH_SEPARATOR = new RegExp(
  `\\r\\n|\\n|\\r|\\u0085|[${String.fromCodePoint(28)}-${String.fromCodePoint(30)}]|\\u2029`,
  "gu"
);
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
function balanceParagraph(controls, boundary) {
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
      message: `${frame.control.name} is not terminated before ${boundary === "paragraph" ? "the paragraph boundary" : "the end of the text"}.`,
      sourceRange: rangeFor(frame.control),
      remediation: frame.kind === "isolate" ? "Add the matching PDI or remove the isolate opener." : "Add the matching PDF or remove the embedding/override opener.",
      control: frame.control
    });
  }
  return findings;
}
function balanceFindings(text, controls) {
  const findings = [];
  let controlIndex = 0;
  for (const match of text.matchAll(UAX9_PARAGRAPH_SEPARATOR)) {
    const paragraphControls = [];
    while (controlIndex < controls.length && controls[controlIndex].index < match.index) {
      paragraphControls.push(controls[controlIndex]);
      controlIndex += 1;
    }
    findings.push(...balanceParagraph(paragraphControls, "paragraph"));
  }
  findings.push(...balanceParagraph(controls.slice(controlIndex), "text"));
  return findings;
}
function isAsciiIdentifierCharacter(value) {
  return value !== void 0 && /^[A-Za-z0-9_$]$/u.test(value);
}
function invisibleCharacterFindings(text) {
  const findings = [];
  const characters = [...text];
  let utf16Index = 0;
  for (let codePointIndex = 0; codePointIndex < characters.length; codePointIndex += 1) {
    const character = characters[codePointIndex];
    const sourceRange = {
      utf16: { start: utf16Index, end: utf16Index + character.length },
      codePoint: { start: codePointIndex, end: codePointIndex + 1 }
    };
    if (character === "\u200B") {
      findings.push({
        code: "HIDDEN_ZERO_WIDTH_SPACE",
        severity: "warning",
        message: "ZERO WIDTH SPACE (U+200B) is hidden and can disguise identifiers, links, or filenames.",
        sourceRange,
        remediation: "Remove it from identifiers and source-like content unless its use is explicitly required."
      });
    }
    if ((character === "\u200C" || character === "\u200D") && isAsciiIdentifierCharacter(characters[codePointIndex - 1]) && isAsciiIdentifierCharacter(characters[codePointIndex + 1])) {
      const name = character === "\u200C" ? "ZERO WIDTH NON-JOINER" : "ZERO WIDTH JOINER";
      findings.push({
        code: "HIDDEN_IDENTIFIER_JOINER",
        severity: "warning",
        message: `${name} is hidden inside an ASCII identifier-like token.`,
        sourceRange,
        remediation: "Remove the joiner from machine identifiers, or document and validate the identifier protocol that requires it."
      });
    }
    if (character === "\u2060") {
      findings.push({
        code: "HIDDEN_WORD_JOINER",
        severity: "info",
        message: "WORD JOINER (U+2060) is invisible and can disguise token boundaries.",
        sourceRange,
        remediation: "Confirm that non-breaking behavior is required; remove it from identifiers and source-like content."
      });
    }
    if (character === "\uFEFF" && codePointIndex > 0) {
      findings.push({
        code: "HIDDEN_MIDSTREAM_BOM",
        severity: "warning",
        message: "ZERO WIDTH NO-BREAK SPACE/BOM (U+FEFF) appears inside the text.",
        sourceRange,
        remediation: "Remove the midstream BOM unless a documented protocol explicitly requires it."
      });
    }
    utf16Index += character.length;
  }
  return findings;
}
function scanBidiSecurity(text, options = {}) {
  const mode = options.mode ?? "audit";
  if (mode === "off") return { mode, safe: true, shouldBlock: false, controls: [], findings: [] };
  const controls = findBidiControls(text);
  const findings = [
    ...controls.map(controlFinding),
    ...balanceFindings(text, controls),
    ...invisibleCharacterFindings(text)
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
var ALL_SANITIZATION_GROUPS = [
  "mark",
  "embedding-override",
  "isolate",
  "deprecated"
];
var SANITIZATION_GROUP_RISK = {
  mark: "low",
  "embedding-override": "high",
  isolate: "medium",
  deprecated: "medium"
};
function sanitizationGroup(codePoint, category) {
  if (codePoint === 8236 || category === "embedding" || category === "override") {
    return "embedding-override";
  }
  if (codePoint === 8297 || category === "isolate") return "isolate";
  if (category === "mark" || category === "deprecated") return category;
  return "deprecated";
}
function sanitizeBidiControls(text, options = {}) {
  const remove = new Set(options.remove ?? ["high", "medium", "low"]);
  const removeGroups = new Set(options.removeGroups ?? ALL_SANITIZATION_GROUPS);
  const grouped = options.removeGroups !== void 0;
  const removed = [];
  let output = "";
  let utf16Index = 0;
  let codePointIndex = 0;
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    const metadata = CONTROL_METADATA.get(codePoint);
    const group = metadata && sanitizationGroup(codePoint, metadata.category);
    const selected = metadata && group && removeGroups.has(group) && remove.has(grouped ? SANITIZATION_GROUP_RISK[group] : metadata.risk);
    if (metadata && selected) {
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
    codePointAtUtf16.fill(codePointOffset, utf16Offset, utf16Offset + character.length);
    utf16Offset += character.length;
    codePointOffset += 1;
  }
  codePointAtUtf16.fill(codePointOffset, utf16Offset);
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
    const codePoint = character?.codePointAt(0);
    if (!character || classifyCharacter(character) !== "neutral" || codePoint !== void 0 && containsCodePoint(COMBINING_MARK_RANGES, codePoint)) break;
    start += character.length;
  }
  while (end > start) {
    const character = text.slice(0, end).match(/.$/su)?.[0];
    const codePoint = character?.codePointAt(0);
    if (!character || classifyCharacter(character) !== "neutral" || codePoint !== void 0 && containsCodePoint(COMBINING_MARK_RANGES, codePoint)) break;
    end -= character.length;
  }
  return { start, end };
}
var HARD_FRAGMENT_SEPARATOR = /[,،;؛:!?؟|]/u;
function normalizeIsolationPlan(text, isolations) {
  const split = [];
  for (const isolation of isolations) {
    if (isolation.kind !== "opposite-direction-run") {
      split.push(isolation);
      continue;
    }
    let pieceStart = isolation.start;
    let cursor = isolation.start;
    for (const character of text.slice(isolation.start, isolation.end)) {
      const index = cursor;
      cursor += character.length;
      if (HARD_FRAGMENT_SEPARATOR.test(character)) {
        const trimmed2 = trimNeutralBoundaries(text, pieceStart, index);
        if (trimmed2.start < trimmed2.end) {
          split.push({
            ...isolation,
            text: text.slice(trimmed2.start, trimmed2.end),
            start: trimmed2.start,
            end: trimmed2.end
          });
        }
        pieceStart = cursor;
      }
    }
    const trimmed = trimNeutralBoundaries(text, pieceStart, isolation.end);
    if (trimmed.start < trimmed.end) {
      split.push({
        ...isolation,
        text: text.slice(trimmed.start, trimmed.end),
        start: trimmed.start,
        end: trimmed.end
      });
    }
  }
  const ordered = split.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [];
  for (const isolation of ordered) {
    const previous = merged.at(-1);
    if (previous && previous.direction === isolation.direction && previous.end <= isolation.start && /^\s*$/u.test(text.slice(previous.end, isolation.start))) {
      previous.end = isolation.end;
      previous.text = text.slice(previous.start, previous.end);
      if (previous.kind !== isolation.kind) previous.kind = "opposite-direction-run";
    } else {
      merged.push({ ...isolation });
    }
  }
  return merged;
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
  const technical = options.excludeTechnicalTokens === false ? [] : findTechnicalTokenRanges(text, options.technicalIdentifiers);
  const isolations = technical.map((range) => ({
    text: range.text,
    direction: "ltr",
    start: range.start,
    end: range.end,
    kind: range.kind
  }));
  if (options.isolateOppositeRuns === false) {
    return attachSourceRanges(text, normalizeIsolationPlan(text, isolations));
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
  return attachSourceRanges(text, normalizeIsolationPlan(text, isolations));
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
  const isolations = planInlineIsolation(source, direction, {
    intervention: options.intervention,
    technicalIdentifiers: options.technicalIdentifiers
  });
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
  const detection = {
    ...options,
    fallback: options.fallback ?? options.inheritedDirection ?? "ltr"
  };
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
      intervention: options.intervention,
      technicalIdentifiers: options.technicalIdentifiers
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

// packages/cli/package.json
var package_default = {
  name: "@bidilens/cli",
  version: "0.3.3",
  description: "CLI for inspecting direction and auditing hidden Unicode bidi controls.",
  license: "MIT",
  author: {
    name: "Shayan SalehiRad",
    url: "https://github.com/CodeinScrubs"
  },
  repository: {
    type: "git",
    url: "git+https://github.com/CodeinScrubs/BidiLens.git",
    directory: "packages/cli"
  },
  homepage: "https://github.com/CodeinScrubs/BidiLens#readme",
  bugs: {
    url: "https://github.com/CodeinScrubs/BidiLens/issues"
  },
  type: "module",
  sideEffects: false,
  keywords: [
    "bidi",
    "rtl",
    "ltr",
    "unicode",
    "cli",
    "security"
  ],
  files: [
    "dist",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "THIRD_PARTY_NOTICES.md",
    "corpus",
    "examples"
  ],
  bin: {
    bidilens: "./dist/bin.js"
  },
  main: "./dist/index.js",
  module: "./dist/index.js",
  types: "./dist/index.d.ts",
  exports: {
    ".": {
      types: "./dist/index.d.ts",
      import: "./dist/index.js",
      default: "./dist/index.js"
    }
  },
  scripts: {
    build: "tsup src/index.ts src/bin.ts --format esm --dts --clean --sourcemap",
    prepack: "pnpm run build",
    example: "node examples/basic.mjs"
  },
  dependencies: {
    "@bidilens/core": "workspace:*",
    "@bidilens/html": "workspace:*",
    commander: "^15.0.0"
  },
  devDependencies: {
    tsup: "^8.5.1"
  },
  engines: {
    node: ">=22.12.0"
  },
  publishConfig: {
    access: "public"
  }
};

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
var CLI_VERSION = package_default.version;
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
function parseCorpus(source, location) {
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new Error(`${location} is not valid JSON. ${String(error)}`, { cause: error });
  }
  if (!Array.isArray(parsed)) throw new Error(`${location} must contain a JSON array.`);
  const ids = /* @__PURE__ */ new Set();
  return parsed.map((item, index) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(`${location}: case ${index + 1} must be an object.`);
    }
    const candidate = item;
    if (typeof candidate.id !== "string" || candidate.id.length === 0) {
      throw new Error(`${location}: case ${index + 1} must have a non-empty string id.`);
    }
    if (ids.has(candidate.id)) throw new Error(`${location}: duplicate case id "${candidate.id}".`);
    ids.add(candidate.id);
    if (typeof candidate.text !== "string") {
      throw new Error(`${location}: case "${candidate.id}" must have string text.`);
    }
    if (candidate.expected !== "ltr" && candidate.expected !== "rtl" && candidate.expected !== "neutral") {
      throw new Error(`${location}: case "${candidate.id}" has invalid expected direction.`);
    }
    return { id: candidate.id, text: candidate.text, expected: candidate.expected };
  });
}
async function readCorpus(cwd, explicitPath) {
  if (explicitPath !== void 0) {
    const location = (0, import_node_path2.resolve)(cwd, explicitPath);
    return parseCorpus(await (0, import_promises.readFile)(location, "utf8"), location);
  }
  const candidates = [
    (0, import_node_path2.resolve)(cwd, "corpus/cases.json"),
    new URL("../corpus/cases.json", import_meta.url),
    new URL("../../../corpus/cases.json", import_meta.url)
  ];
  let lastError;
  for (const candidate of candidates) {
    let source;
    try {
      source = await (0, import_promises.readFile)(candidate, "utf8");
    } catch (error) {
      lastError = error;
      continue;
    }
    return parseCorpus(source, String(candidate));
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
  const newline = new RegExp(`${DEFAULT_PARAGRAPH_SEPARATOR_SOURCE}|\\u2028`, "gu");
  let match;
  while ((match = newline.exec(text)) !== null && match.index < utf16Offset) {
    lineNumber += 1;
    lineStart = match.index + match[0].length;
  }
  return { line: lineNumber, column: utf16Offset - lineStart + 1 };
}
function artifactUri(file, cwd) {
  const local = (0, import_node_path2.relative)(cwd, file);
  if (local && !local.startsWith("..") && !(0, import_node_path2.isAbsolute)(local)) return local.replaceAll("\\", "/");
  return (0, import_node_url.pathToFileURL)(file).href;
}
async function readTextInput(options, cwd) {
  if (options.text === void 0 && options.file === void 0) {
    throw new Error("Provide --text or --file.");
  }
  if (options.text !== void 0 && options.file !== void 0) {
    throw new Error("Choose either --text or --file, not both.");
  }
  return options.file !== void 0 ? (0, import_promises.readFile)((0, import_node_path2.resolve)(cwd, options.file), "utf8") : options.text;
}
function sarifForReports(reports, cwd) {
  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{
      columnKind: "utf16CodeUnits",
      tool: { driver: { name: "BidiLens", semanticVersion: CLI_VERSION } },
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
  program2.name("bidilens").description("Inspect and secure mixed bidirectional text").version(CLI_VERSION).exitOverride().configureOutput({ writeOut: state.stdout, writeErr: state.stderr });
  program2.command("inspect").description("Analyze a string or file").option("-t, --text <text>", "text to inspect").option("-f, --file <path>", "file to inspect").option("--json", "emit JSON").action(async (options) => {
    const text = await readTextInput(options, state.cwd);
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
    const text = await readTextInput(options, state.cwd);
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
