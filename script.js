/* =========================================================
   KRISHNA'S CSE CALCULATOR
   Scientific engine with huge exponent support
   Matrix engine: dynamic 1x1 -> 10x10
========================================================= */

"use strict";

/* -----------------------------
   ELEMENTS
----------------------------- */

const display = document.getElementById("display");
const expressionBox = document.getElementById("expression");

const shiftStatus = document.getElementById("shiftStatus");
const alphaStatus = document.getElementById("alphaStatus");
const angleStatus = document.getElementById("angleStatus");
const matrixStatus = document.getElementById("matrixStatus");

let expression = "";
let answer = "0";
let memory = "0";

let shift = false;
let alpha = false;

let angleMode = "DEG";

let history = [];
let historyIndex = -1;

let fractionDisplay = false;


/* =========================================================
   SCIENTIFIC NUMBER
   value = mantissa × 10^exponent
========================================================= */

function S(m, e = 0) {
    return {
        m: Number(m),
        e: BigInt(e)
    };
}

function normalize(a) {

    if (!Number.isFinite(a.m)) {
        throw new Error("Math ERROR");
    }

    if (a.m === 0) {
        return S(0, 0);
    }

    let power = Math.floor(Math.log10(Math.abs(a.m)));

    a.m = a.m / Math.pow(10, power);
    a.e = a.e + BigInt(power);

    return a;
}

function fromNumber(n) {

    if (!Number.isFinite(n)) {
        throw new Error("Math ERROR");
    }

    if (n === 0) {
        return S(0, 0);
    }

    const e = Math.floor(Math.log10(Math.abs(n)));

    return normalize(
        S(
            n / Math.pow(10, e),
            e
        )
    );
}

function parseScientific(str) {

    str = String(str)
        .replace(/×10\^/g, "e")
        .replace(/×/g, "*");

    const match =
        str.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:[eE]([+-]?\d+))?$/);

    if (!match) {
        throw new Error("Syntax ERROR");
    }

    const mantissa = Number(match[1]);
    const exponent = match[2] ? BigInt(match[2]) : 0n;

    return normalize(S(mantissa, exponent));
}


/* =========================================================
   SCIENTIFIC ARITHMETIC
========================================================= */

function add(a, b) {

    a = normalize(a);
    b = normalize(b);

    if (a.m === 0) return b;
    if (b.m === 0) return a;

    const difference = a.e - b.e;

    if (difference > 18n) return a;
    if (difference < -18n) return b;

    if (difference >= 0n) {

        return normalize(
            S(
                a.m * Math.pow(10, Number(difference)) + b.m,
                a.e
            )
        );

    } else {

        return normalize(
            S(
                a.m + b.m * Math.pow(10, Number(-difference)),
                b.e
            )
        );
    }
}

function subtract(a, b) {
    return add(a, S(-b.m, b.e));
}

function multiply(a, b) {

    return normalize(
        S(
            a.m * b.m,
            a.e + b.e
        )
    );
}

function divide(a, b) {

    if (b.m === 0) {
        throw new Error("Math ERROR");
    }

    return normalize(
        S(
            a.m / b.m,
            a.e - b.e
        )
    );
}

function negate(a) {
    return S(-a.m, a.e);
}


/* =========================================================
   FORMAT
========================================================= */

function scientificString(a) {

    a = normalize(a);

    if (a.m === 0) return "0";

    let m = Number(a.m.toPrecision(12));

    /*
       Normal display for moderate numbers.
    */

    if (a.e >= -6n && a.e <= 12n) {

        const n =
            a.m * Math.pow(10, Number(a.e));

        if (Number.isFinite(n)) {
            return String(Number(n.toPrecision(12)));
        }
    }

    return `${m}×10^${a.e.toString()}`;
}


/* =========================================================
   POWER
========================================================= */

function powerNumber(base, exponent) {

    base = normalize(base);
    exponent = normalize(exponent);

    if (base.m === 0 && exponent.m <= 0) {
        throw new Error("Math ERROR");
    }

    /*
       Integer exponent.
    */

    if (
        exponent.e === 0n &&
        Number.isInteger(exponent.m) &&
        Math.abs(exponent.m) <= 10000000
    ) {

        let n = exponent.m;

        if (n === 0) {
            return S(1, 0);
        }

        let negative = n < 0;

        if (negative) n = -n;

        let result = S(1, 0);
        let current = base;

        while (n > 0) {

            if (n % 2 === 1) {
                result = multiply(result, current);
            }

            current = multiply(current, current);

            n = Math.floor(n / 2);
        }

        return negative
            ? divide(S(1, 0), result)
            : result;
    }

    /*
       Non-integer exponent.
    */

    if (base.m <= 0) {
        throw new Error("Math ERROR");
    }

    const exponentValue =
        exponent.m * Math.pow(10, Number(exponent.e));

    const logBase =
        Math.log10(base.m) +
        Number(base.e);

    const finalPower =
        logBase * exponentValue;

    if (!Number.isFinite(finalPower)) {
        throw new Error("Math ERROR");
    }

    /*
       Keep huge powers without converting
       the whole number into Infinity.
    */

    if (finalPower > 10000000) {

        return S(
            1,
            BigInt(Math.round(finalPower))
        );
    }

    if (finalPower < -10000000) {

        return S(
            1,
            BigInt(Math.round(finalPower))
        );
    }

    const e = Math.floor(finalPower);

    const m =
        Math.pow(10, finalPower - e);

    return normalize(
        S(m, e)
    );
}


/* =========================================================
   FUNCTIONS
========================================================= */

function squareRoot(a) {

    if (a.m < 0) {
        throw new Error("Math ERROR");
    }

    if (a.m === 0) return S(0, 0);

    let exponent = a.e;

    let mantissa = a.m;

    /*
       Make exponent even.
    */

    if (exponent % 2n !== 0n) {

        mantissa *= 10;
        exponent -= 1n;
    }

    return normalize(
        S(
            Math.sqrt(mantissa),
            exponent / 2n
        )
    );
}

function cubeRoot(a) {

    return normalize(
        S(
            Math.cbrt(a.m),
            a.e / 3n
        )
    );
}

function absolute(a) {
    return S(Math.abs(a.m), a.e);
}

function factorialNumber(n) {

    if (
        !Number.isFinite(n) ||
        n < 0 ||
        !Number.isInteger(n)
    ) {
        throw new Error("Math ERROR");
    }

    /*
       Keep factorial practical.
    */

    if (n > 100000) {
        throw new Error("Math ERROR");
    }

    let result = S(1, 0);

    for (let i = 2; i <= n; i++) {
        result = multiply(result, S(i, 0));
    }

    return result;
}


/* =========================================================
   TRIG
========================================================= */

function angleToRad(x) {

    if (angleMode === "DEG") {
        return x * Math.PI / 180;
    }

    if (angleMode === "GRAD") {
        return x * Math.PI / 200;
    }

    return x;
}

function radToAngle(x) {

    if (angleMode === "DEG") {
        return x * 180 / Math.PI;
    }

    if (angleMode === "GRAD") {
        return x * 200 / Math.PI;
    }

    return x;
}

function normalValue(a) {

    const value =
        a.m * Math.pow(10, Number(a.e));

    if (!Number.isFinite(value)) {
        throw new Error("Math ERROR");
    }

    /*
       Trigonometric functions need a
       normal finite number.
    */

    if (Number(a.e) > 308 || Number(a.e) < -308) {
        throw new Error("Math ERROR");
    }

    return value;
}

function trig(name, a) {

    const value = normalValue(a);

    const rad = angleToRad(value);

    if (name === "sin") return fromNumber(Math.sin(rad));
    if (name === "cos") return fromNumber(Math.cos(rad));
    if (name === "tan") return fromNumber(Math.tan(rad));

    if (name === "asin") {
        return fromNumber(radToAngle(Math.asin(value)));
    }

    if (name === "acos") {
        return fromNumber(radToAngle(Math.acos(value)));
    }

    if (name === "atan") {
        return fromNumber(radToAngle(Math.atan(value)));
    }

    throw new Error("Math ERROR");
}

function logarithm(a) {

    if (a.m <= 0) {
        throw new Error("Math ERROR");
    }

    return fromNumber(
        Math.log10(a.m) +
        Number(a.e)
    );
}

function naturalLog(a) {

    if (a.m <= 0) {
        throw new Error("Math ERROR");
    }

    return fromNumber(
        Math.log(a.m) +
        Number(a.e) * Math.LN10
    );
}

function tenPower(a) {

    const v =
        a.m * Math.pow(10, Number(a.e));

    if (!Number.isFinite(v)) {
        throw new Error("Math ERROR");
    }

    if (v > 10000000 || v < -10000000) {

        return S(
            1,
            BigInt(Math.round(v))
        );
    }

    const exponent = Math.floor(v);

    return normalize(
        S(
            Math.pow(10, v - exponent),
            exponent
        )
    );
}

function ePower(a) {

    const v = normalValue(a);

    if (v > 10000000 || v < -10000000) {
        throw new Error("Math ERROR");
    }

    return fromNumber(Math.exp(v));
}


/* =========================================================
   TOKENIZER
========================================================= */

function tokenize(text) {

    text = text
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .replace(/\s+/g, "");

    const tokens = [];

    let i = 0;

    const functions = [
        "asin",
        "acos",
        "atan",
        "sqrt",
        "cbrt",
        "sin",
        "cos",
        "tan",
        "log",
        "ln",
        "abs",
        "tenpow",
        "epow"
    ];

    while (i < text.length) {

        const c = text[i];

        /*
           Numbers
        */

        if (/[0-9.]/.test(c)) {

            let start = i;

            while (
                i < text.length &&
                /[0-9.]/.test(text[i])
            ) {
                i++;
            }

            /*
               Scientific notation:
               1e-1000
            */

            if (
                text[i] === "e" ||
                text[i] === "E"
            ) {

                i++;

                if (
                    text[i] === "+" ||
                    text[i] === "-"
                ) {
                    i++;
                }

                while (
                    i < text.length &&
                    /[0-9]/.test(text[i])
                ) {
                    i++;
                }
            }

            tokens.push(text.slice(start, i));

            continue;
        }

        /*
           Constants
        */

        if (c === "π") {
            tokens.push("PI");
            i++;
            continue;
        }

        /*
           e constant
        */

        if (
            c === "e" ||
            c === "E"
        ) {
            /*
               If e is directly after
               a number it was handled above.
            */

            tokens.push("E_CONST");
            i++;
            continue;
        }

        /*
           Functions
        */

        let foundFunction = false;

        for (const fn of functions) {

            if (text.startsWith(fn + "(", i)) {

                tokens.push(fn);
                i += fn.length;

                foundFunction = true;
                break;
            }
        }

        if (foundFunction) continue;

        /*
           Operators / brackets
        */

        if (
            "+-*/^(),".includes(c)
        ) {
            tokens.push(c);
            i++;
            continue;
        }

        throw new Error("Syntax ERROR");
    }

    return tokens;
}


/* =========================================================
   PARSER
========================================================= */

function evaluate(text) {

    const tokens = tokenize(text);

    let position = 0;

    function peek() {
        return tokens[position];
    }

    function consume(token) {

        if (tokens[position] === token) {
            position++;
            return true;
        }

        return false;
    }

    function primary() {

        const token = peek();

        /*
           Parentheses
        */

        if (consume("(")) {

            const value = addSub();

            if (!consume(")")) {
                throw new Error("Syntax ERROR");
            }

            return value;
        }

        /*
           Functions
        */

        const functions = [
            "sqrt",
            "cbrt",
            "sin",
            "cos",
            "tan",
            "asin",
            "acos",
            "atan",
            "log",
            "ln",
            "abs",
            "tenpow",
            "epow"
        ];

        if (functions.includes(token)) {

            position++;

            if (!consume("(")) {
                throw new Error("Syntax ERROR");
            }

            const value = addSub();

            if (!consume(")")) {
                throw new Error("Syntax ERROR");
            }

            if (token === "sqrt") {
                return squareRoot(value);
            }

            if (token === "cbrt") {
                return cubeRoot(value);
            }

            if (token === "log") {
                return logarithm(value);
            }

            if (token === "ln") {
                return naturalLog(value);
            }

            if (token === "abs") {
                return absolute(value);
            }

            if (token === "tenpow") {
                return tenPower(value);
            }

            if (token === "epow") {
                return ePower(value);
            }

            return trig(token, value);
        }

        /*
           Constants
        */

        if (token === "PI") {
            position++;
            return fromNumber(Math.PI);
        }

        if (token === "E_CONST") {
            position++;
            return fromNumber(Math.E);
        }

        /*
           Number
        */

        if (
            token &&
            (
                /^[0-9.]/.test(token)
            )
        ) {

            position++;

            return parseScientific(token);
        }

        throw new Error("Syntax ERROR");
    }


    function unary() {

        if (consume("+")) {
            return unary();
        }

        if (consume("-")) {
            return negate(unary());
        }

        return primary();
    }


    function power() {

        let left = unary();

        if (consume("^")) {

            /*
               Important:
               allows 10^(-1000000)
            */

            const right = unary();

            left = powerNumber(left, right);
        }

        return left;
    }


    function multiplyDivide() {

        let value = power();

        while (
            peek() === "*" ||
            peek() === "/"
        ) {

            const operator = tokens[position++];

            const next = power();

            if (operator === "*") {
                value = multiply(value, next);
            } else {
                value = divide(value, next);
            }
        }

        return value;
    }


    function addSub() {

        let value = multiplyDivide();

        while (
            peek() === "+" ||
            peek() === "-"
        ) {

            const operator = tokens[position++];

            const next = multiplyDivide();

            if (operator === "+") {
                value = add(value, next);
            } else {
                value = subtract(value, next);
            }
        }

        return value;
    }


    const result = addSub();

    if (position !== tokens.length) {
        throw new Error("Syntax ERROR");
    }

    return result;
}


/* =========================================================
   DISPLAY
========================================================= */

function updateDisplay() {

    expressionBox.textContent = expression || "";

    display.textContent =
        expression || "0";
}

function showResult(result) {

    answer = scientificString(result);

    expressionBox.textContent =
        expression + " =";

    display.textContent = answer;

    history.push(
        expression + " = " + answer
    );

    historyIndex = history.length;

    expression = answer;
}


/* =========================================================
   BASIC INPUT
========================================================= */

function insert(value) {

    if (
        expression === "0" &&
        value !== "."
    ) {
        expression = "";
    }

    expression += value;

    updateDisplay();
}

function clearAll() {

    expression = "";

    display.textContent = "0";
    expressionBox.textContent = "";
}

function deleteLast() {

    expression =
        expression.slice(0, -1);

    updateDisplay();
}


/* =========================================================
   CALCULATE
========================================================= */

function calculate() {

    if (!expression) return;

    try {

        const result =
            evaluate(expression);

        showResult(result);

    } catch (error) {

        display.textContent =
            error.message || "Math ERROR";
    }
}


/* =========================================================
   FUNCTION INSERTION
========================================================= */

function insertFunction(name) {

    /*
       If there is no expression,
       insert function with bracket.

       √ becomes sqrt(
    */

    if (!expression) {

        expression =
            name + "(";

        updateDisplay();

        return;
    }

    /*
       If expression ends with operator,
       insert function.
    */

    if (
        /[+\-*/^(]$/.test(expression)
    ) {

        expression +=
            name + "(";

        updateDisplay();

        return;
    }

    /*
       Otherwise calculate current
       expression and apply function.
    */

    try {

        const value =
            evaluate(expression);

        let result;

        if (name === "sqrt")
            result = squareRoot(value);

        else if (name === "cbrt")
            result = cubeRoot(value);

        else if (name === "log")
            result = logarithm(value);

        else if (name === "ln")
            result = naturalLog(value);

        else if (name === "abs")
            result = absolute(value);

        else
            result = trig(name, value);

        expression =
            scientificString(result);

        updateDisplay();

    } catch (error) {

        display.textContent =
            error.message || "Math ERROR";
    }
}


/* =========================================================
   UNARY BUTTONS
========================================================= */

function unaryOperation(type) {

    try {

        const value =
            evaluate(expression || "0");

        let result;

        switch (type) {

            case "square":
                result = multiply(value, value);
                break;

            case "cube":
                result =
                    multiply(
                        multiply(value, value),
                        value
                    );
                break;

            case "inverse":
                result =
                    divide(
                        S(1, 0),
                        value
                    );
                break;

            case "factorial":
                result =
                    factorialNumber(
                        normalValue(value)
                    );
                break;

            case "percent":
                result =
                    divide(
                        value,
                        S(100, 0)
                    );
                break;

            case "abs":
                result = absolute(value);
                break;

            default:
                result = value;
        }

        expression =
            scientificString(result);

        answer = expression;

        updateDisplay();

    } catch (error) {

        display.textContent =
            error.message || "Math ERROR";
    }
}


/* =========================================================
   BUTTON EVENTS
========================================================= */

document
.querySelectorAll("[data-value]")
.forEach(button => {

    button.addEventListener("click", () => {

        insert(button.dataset.value);
    });
});


document
.querySelectorAll("[data-action]")
.forEach(button => {

    button.addEventListener("click", () => {

        const action =
            button.dataset.action;

        handleAction(action);
    });
});


function handleAction(action) {

    switch (action) {

        case "clear":
            clearAll();
            break;

        case "delete":
            deleteLast();
            break;

        case "equals":
            calculate();
            break;

        case "open":
            insert("(");
            break;

        case "close":
            insert(")");
            break;

        case "pi":
            insert("π");
            break;

        case "constantE":
            insert("e");
            break;

        case "ans":
            insert(answer);
            break;

        case "negate":
            insert("-");
            break;

        case "comma":
            insert(",");
            break;

        case "sqrt":
            insertFunction("sqrt");
            break;

        case "cbrt":
            insertFunction("cbrt");
            break;

        case "sin":
            insertFunction(
                shift ? "asin" : "sin"
            );
            break;

        case "cos":
            insertFunction(
                shift ? "acos" : "cos"
            );
            break;

        case "tan":
            insertFunction(
                shift ? "atan" : "tan"
            );
            break;

        case "asin":
            insertFunction("asin");
            break;

        case "acos":
            insertFunction("acos");
            break;

        case "atan":
            insertFunction("atan");
            break;

        case "log":
            insertFunction("log");
            break;

        case "ln":
            insertFunction("ln");
            break;

        case "square":
            unaryOperation("square");
            break;

        case "cube":
            unaryOperation("cube");
            break;

        case "inverse":
            unaryOperation("inverse");
            break;

        case "factorial":
            unaryOperation("factorial");
            break;

        case "percent":
            unaryOperation("percent");
            break;

        case "abs":
            unaryOperation("abs");
            break;

        case "tenPower":
            insertFunction("tenpow");
            break;

        case "ePower":
            insertFunction("epow");
            break;

        case "power":
            insert("^");
            break;

        case "exp":
            insert("×10^(");
            break;

        case "shift":
            shift = !shift;

            shiftStatus.textContent =
                shift ? "S" : "";

            shiftStatus.style.color =
                shift ? "#ffd52a" : "";

            break;

        case "alpha":
            alpha = !alpha;

            alphaStatus.textContent =
                alpha ? "A" : "";

            alphaStatus.style.color =
                alpha ? "#ff5060" : "";

            break;

        case "mode":

            angleMode =
                angleMode === "DEG"
                    ? "RAD"
                    : angleMode === "RAD"
                        ? "GRAD"
                        : "DEG";

            angleStatus.textContent =
                angleMode;

            break;

        case "setup":

            angleMode =
                angleMode === "DEG"
                    ? "RAD"
                    : "DEG";

            angleStatus.textContent =
                angleMode;

            break;

        case "fraction":

            fractionDisplay =
                !fractionDisplay;

            break;

        case "sd":

            if (expression) {

                try {

                    const result =
                        evaluate(expression);

                    expression =
                        fractionDisplay
                            ? decimalToFraction(
                                normalValue(result)
                            )
                            : scientificString(result);

                    fractionDisplay =
                        !fractionDisplay;

                    updateDisplay();

                } catch (e) {
                    display.textContent =
                        e.message;
                }
            }

            break;

        case "rnd":

            try {

                const value =
                    evaluate(expression || "0");

                expression =
                    scientificString(
                        fromNumber(
                            Math.round(
                                normalValue(value)
                            )
                        )
                    );

                updateDisplay();

            } catch (e) {
                display.textContent =
                    e.message;
            }

            break;

        case "eng":

            try {

                const value =
                    evaluate(expression || "0");

                expression =
                    engineeringString(value);

                updateDisplay();

            } catch (e) {
                display.textContent =
                    e.message;
            }

            break;

        case "sto":
            memory = answer;
            break;

        case "rcl":
            insert(memory);
            break;

        case "mplus":

            try {

                const a =
                    parseScientific(memory);

                const b =
                    evaluate(expression || "0");

                memory =
                    scientificString(
                        add(a, b)
                    );

            } catch (e) {

                display.textContent =
                    e.message;
            }

            break;

        case "mminus":

            try {

                const a =
                    parseScientific(memory);

                const b =
                    evaluate(expression || "0");

                memory =
                    scientificString(
                        subtract(a, b)
                    );

            } catch (e) {

                display.textContent =
                    e.message;
            }

            break;

        case "up":
            replay(-1);
            break;

        case "down":
            replay(1);
            break;

        case "left":
        case "right":
            break;

        case "calc":
            calculate();
            break;

        case "hyp":
            display.textContent = "HYP";
            break;

        case "matrix":
            openMatrix();
            break;
    }
}


/* =========================================================
   FRACTION
========================================================= */

function decimalToFraction(value) {

    if (!Number.isFinite(value)) {
        throw new Error("Math ERROR");
    }

    let sign = value < 0 ? -1 : 1;

    value = Math.abs(value);

    if (Number.isInteger(value)) {
        return String(sign * value);
    }

    let denominator = 1;

    while (
        denominator < 1000000 &&
        Math.abs(
            Math.round(value * denominator) -
            value * denominator
        ) > 1e-10
    ) {

        denominator *= 10;
    }

    const numerator =
        Math.round(value * denominator);

    const gcdValue =
        gcd(
            Math.abs(numerator),
            denominator
        );

    return `${sign * (numerator / gcdValue)}/${denominator / gcdValue}`;
}

function gcd(a, b) {

    while (b !== 0) {
        const t = a % b;
        a = b;
        b = t;
    }

    return a;
}


/* =========================================================
   ENGINEERING FORMAT
========================================================= */

function engineeringString(a) {

    a = normalize(a);

    if (a.m === 0) return "0";

    let e = a.e;

    const rem =
        ((e % 3n) + 3n) % 3n;

    const engExponent =
        e - rem;

    const m =
        a.m *
        Math.pow(10, Number(rem));

    return `${Number(m.toPrecision(10))}×10^${engExponent}`;
}


/* =========================================================
   REPLAY
========================================================= */

function replay(direction) {

    if (!history.length) return;

    historyIndex += direction;

    if (historyIndex < 0)
        historyIndex = 0;

    if (historyIndex >= history.length)
        historyIndex = history.length - 1;

    const item =
        history[historyIndex];

    expression =
        item.split(" = ")[0];

    updateDisplay();
}


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        const key = event.key;

        if (/^[0-9.]$/.test(key)) {
            insert(key);
            return;
        }

        if (
            ["+","-","*","/","^","(",")"]
            .includes(key)
        ) {
            insert(key);
            return;
        }

        if (key === "Enter" || key === "=") {
            calculate();
            return;
        }

        if (key === "Backspace") {
            deleteLast();
            return;
        }

        if (key === "Escape") {
            clearAll();
        }
    }
);


/* =========================================================
   MATRIX ENGINE
   Supports 1x1 -> 10x10
========================================================= */

const matrixPanel =
    document.getElementById("matrixPanel");

const matrixInputs =
    document.getElementById("matrixInputs");

const rowsInput =
    document.getElementById("rows");

const colsInput =
    document.getElementById("cols");

const matrixOperation =
    document.getElementById("matrixOperation");

const matrixExtra =
    document.getElementById("matrixExtra");

const matrixResult =
    document.getElementById("matrixResult");


function openMatrix() {

    matrixPanel.classList.toggle("show");

    matrixStatus.textContent =
        matrixPanel.classList.contains("show")
            ? "MAT"
            : "";
}


document
.getElementById("createMatrix")
.addEventListener(
    "click",
    createMatrixInputs
);


document
.getElementById("closeMatrix")
.addEventListener(
    "click",
    () => {

        matrixPanel.classList.remove("show");
        matrixStatus.textContent = "";
    }
);


function createMatrixInputs() {

    let rows =
        Number(rowsInput.value);

    let cols =
        Number(colsInput.value);

    rows =
        Math.max(
            1,
            Math.min(10, rows)
        );

    cols =
        Math.max(
            1,
            Math.min(10, cols)
        );

    rowsInput.value = rows;
    colsInput.value = cols;

    matrixInputs.innerHTML = "";

    const operation =
        matrixOperation.value;

    const needB =
        operation === "add" ||
        operation === "sub" ||
        operation === "mul";

    createOneMatrix("A", rows, cols);

    if (needB) {
        createOneMatrix("B", rows, cols);
    }
}


function createOneMatrix(name, rows, cols) {

    const title =
        document.createElement("div");

    title.className = "matrix-name";
    title.textContent =
        `Matrix ${name} (${rows} × ${cols})`;

    matrixInputs.appendChild(title);

    const grid =
        document.createElement("div");

    grid.className =
        "matrix-grid";

    grid.style.gridTemplateColumns =
        `repeat(${cols},55px)`;

    for (
        let r = 0;
        r < rows;
        r++
    ) {

        for (
            let c = 0;
            c < cols;
            c++
        ) {

            const input =
                document.createElement("input");

            input.type = "number";
            input.step = "any";

            /*
               Identity matrix default.
            */

            input.value =
                r === c ? "1" : "0";

            input.dataset.matrix =
                name;

            input.dataset.row =
                r;

            input.dataset.col =
                c;

            grid.appendChild(input);
        }
    }

    matrixInputs.appendChild(grid);
}


function readMatrix(name) {

    const rows =
        Number(rowsInput.value);

    const cols =
        Number(colsInput.value);

    const elements =
        [
            ...document.querySelectorAll(
                `input[data-matrix="${name}"]`
            )
        ];

    const matrix = [];

    for (
        let r = 0;
        r < rows;
        r++
    ) {

        const row = [];

        for (
            let c = 0;
            c < cols;
            c++
        ) {

            const input =
                elements.find(
                    x =>
                        Number(x.dataset.row) === r &&
                        Number(x.dataset.col) === c
                );

            row.push(
                Number(input?.value || 0)
            );
        }

        matrix.push(row);
    }

    return matrix;
}


/* -----------------------------
   MATRIX OPERATIONS
----------------------------- */

function matrixAdd(A, B) {

    if (
        A.length !== B.length ||
        A[0].length !== B[0].length
    ) {
        throw new Error("Dimension ERROR");
    }

    return A.map(
        (row, r) =>
            row.map(
                (value, c) =>
                    value + B[r][c]
            )
    );
}


function matrixSub(A, B) {

    if (
        A.length !== B.length ||
        A[0].length !== B[0].length
    ) {
        throw new Error("Dimension ERROR");
    }

    return A.map(
        (row, r) =>
            row.map(
                (value, c) =>
                    value - B[r][c]
            )
    );
}


function matrixMultiply(A, B) {

    if (A[0].length !== B.length) {
        throw new Error(
            "Dimension ERROR: A columns must equal B rows"
        );
    }

    const result =
        Array.from(
            { length: A.length },
            () =>
                Array(B[0].length).fill(0)
        );

    /*
       Optimized matrix multiplication.
    */

    for (
        let i = 0;
        i < A.length;
        i++
    ) {

        for (
            let k = 0;
            k < B.length;
            k++
        ) {

            const aik =
                A[i][k];

            for (
                let j = 0;
                j < B[0].length;
                j++
            ) {

                result[i][j] +=
                    aik * B[k][j];
            }
        }
    }

    return result;
}


function matrixTranspose(A) {

    return A[0].map(
        (_, c) =>
            A.map(
                row => row[c]
            )
    );
}


function matrixDeterminant(A) {

    if (
        A.length !==
        A[0].length
    ) {
        throw new Error(
            "Square matrix required"
        );
    }

    const n = A.length;

    const M =
        A.map(row => row.slice());

    let determinant = 1;

    for (
        let i = 0;
        i < n;
        i++
    ) {

        let pivot = i;

        for (
            let r = i + 1;
            r < n;
            r++
        ) {

            if (
                Math.abs(M[r][i]) >
                Math.abs(M[pivot][i])
            ) {
                pivot = r;
            }
        }

        if (
            Math.abs(M[pivot][i]) <
            1e-12
        ) {
            return 0;
        }

        if (pivot !== i) {

            [
                M[pivot],
                M[i]
            ] =
            [
                M[i],
                M[pivot]
            ];

            determinant *= -1;
        }

        const pivotValue =
            M[i][i];

        determinant *=
            pivotValue;

        for (
            let r = i + 1;
            r < n;
            r++
        ) {

            const factor =
                M[r][i] /
                pivotValue;

            for (
                let c = i;
                c < n;
                c++
            ) {

                M[r][c] -=
                    factor *
                    M[i][c];
            }
        }
    }

    return determinant;
}


function matrixInverse(A) {

    const n = A.length;

    if (n !== A[0].length) {
        throw new Error(
            "Square matrix required"
        );
    }

    const M =
        A.map(
            (row, i) =>
                row.concat(
                    Array.from(
                        { length: n },
                        (_, j) =>
                            i === j ? 1 : 0
                    )
                )
        );

    for (
        let i = 0;
        i < n;
        i++
    ) {

        let pivot = i;

        for (
            let r = i + 1;
            r < n;
            r++
        ) {

            if (
                Math.abs(M[r][i]) >
                Math.abs(M[pivot][i])
            ) {
                pivot = r;
            }
        }

        if (
            Math.abs(M[pivot][i]) <
            1e-12
        ) {
            throw new Error(
                "Singular Matrix"
            );
        }

        [
            M[i],
            M[pivot]
        ] =
        [
            M[pivot],
            M[i]
        ];

        const p =
            M[i][i];

        for (
            let c = 0;
            c < 2 * n;
            c++
        ) {
            M[i][c] /= p;
        }

        for (
            let r = 0;
            r < n;
            r++
        ) {

            if (r === i) continue;

            const factor =
                M[r][i];

            for (
                let c = 0;
                c < 2 * n;
                c++
            ) {

                M[r][c] -=
                    factor *
                    M[i][c];
            }
        }
    }

    return M.map(
        row =>
            row.slice(n)
    );
}


function matrixScalar(A, k) {

    return A.map(
        row =>
            row.map(
                value =>
                    value * k
            )
    );
}


function matrixPower(A, n) {

    if (
        A.length !== A[0].length
    ) {
        throw new Error(
            "Square matrix required"
        );
    }

    if (
        !Number.isInteger(n) ||
        n < 0
    ) {
        throw new Error(
            "Matrix power requires positive integer"
        );
    }

    let result =
        Array.from(
            { length: A.length },
            (_, r) =>
                Array.from(
                    { length: A.length },
                    (_, c) =>
                        r === c ? 1 : 0
                )
        );

    let base = A;

    while (n > 0) {

        if (n % 2 === 1) {
            result =
                matrixMultiply(
                    result,
                    base
                );
        }

        base =
            matrixMultiply(
                base,
                base
            );

        n =
            Math.floor(n / 2);
    }

    return result;
}


/* =========================================================
   MATRIX CALCULATE
========================================================= */

document
.getElementById("calculateMatrix")
.addEventListener(
    "click",
    () => {

        try {

            const operation =
                matrixOperation.value;

            const A =
                readMatrix("A");

            let result;

            if (operation === "add") {

                const B =
                    readMatrix("B");

                result =
                    matrixAdd(A, B);
            }

            else if (operation === "sub") {

                const B =
                    readMatrix("B");

                result =
                    matrixSub(A, B);
            }

            else if (operation === "mul") {

                const B =
                    readMatrix("B");

                result =
                    matrixMultiply(A, B);
            }

            else if (operation === "detA") {

                result =
                    [[
                        matrixDeterminant(A)
                    ]];
            }

            else if (operation === "detB") {

                const B =
                    readMatrix("B");

                result =
                    [[
                        matrixDeterminant(B)
                    ]];
            }

            else if (operation === "invA") {

                result =
                    matrixInverse(A);
            }

            else if (operation === "invB") {

                const B =
                    readMatrix("B");

                result =
                    matrixInverse(B);
            }

            else if (operation === "transposeA") {

                result =
                    matrixTranspose(A);
            }

            else if (operation === "transposeB") {

                const B =
                    readMatrix("B");

                result =
                    matrixTranspose(B);
            }

            else if (operation === "scalarA") {

                const k =
                    Number(matrixExtra.value);

                if (!Number.isFinite(k)) {
                    throw new Error(
                        "Enter scalar k"
                    );
                }

                result =
                    matrixScalar(A, k);
            }

            else if (operation === "powerA") {

                const n =
                    Number(matrixExtra.value);

                result =
                    matrixPower(A, n);
            }

            matrixResult.textContent =
                formatMatrix(result);

        } catch (error) {

            matrixResult.textContent =
                error.message ||
                "Matrix ERROR";
        }
    }
);


/* =========================================================
   MATRIX FORMAT
========================================================= */

function formatMatrix(A) {

    return A
        .map(
            row =>
                "[ " +
                row
                    .map(
                        x =>
                            Number(
                                x.toPrecision(10)
                            )
                    )
                    .join("    ") +
                " ]"
        )
        .join("\n");
}


/* =========================================================
   INITIALIZE
========================================================= */

createMatrixInputs();

display.textContent = "0";
