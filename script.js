/* =========================================================
   FINNAI
   SISTEMA DE SIMULAÇÃO SAC x PRICE
========================================================= */


/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const DEFAULTS = {

    income: 8000,

    amount: 300000,

    downPayment: 60000,

    annualRate: 10.5,

    months: 360

};

let simulation = null;

let currentTableMethod = "sac";

let visibleRows = 12;

let mainChart = null;

let compositionChart = null;

let totalChart = null;


/* =========================================================
   HELPERS
========================================================= */

const $ = selector =>
    document.querySelector(selector);

const $$ = selector =>
    document.querySelectorAll(selector);


function money(value) {

    return new Intl.NumberFormat(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    ).format(value || 0);

}


function number(value) {

    return new Intl.NumberFormat(
        "pt-BR",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(value || 0);

}


function percent(value) {

    return `${number(value)}%`;

}


function clamp(value, min, max) {

    return Math.min(
        Math.max(value, min),
        max
    );

}


/* =========================================================
   INPUTS
========================================================= */

const income = $("#income");
const amount = $("#amount");
const downPayment = $("#downPayment");
const annualRate = $("#annualRate");
const months = $("#months");

const incomeRange = $("#incomeRange");
const amountRange = $("#amountRange");
const rateRange = $("#rateRange");
const monthsRange = $("#monthsRange");


/* =========================================================
   RANGE SYNCHRONIZATION
========================================================= */

function syncRange(input, range) {

    if (!input || !range) return;

    range.value = input.value;

    updateRangeProgress(range);

}


function syncInput(range, input) {

    if (!input || !range) return;

    input.value = range.value;

    updateRangeProgress(range);

}


function updateRangeProgress(range) {

    const min = Number(range.min);

    const max = Number(range.max);

    const value = Number(range.value);

    const percentage =
        ((value - min) / (max - min)) * 100;

    range.style.setProperty(
        "--range-progress",
        `${percentage}%`
    );

}


/* =========================================================
   PREVIEWS
========================================================= */

function updatePreviews() {

    $("#incomePreview").textContent =
        money(Number(income.value));

    $("#amountPreview").textContent =
        money(Number(amount.value));

    $("#downPaymentPreview").textContent =
        money(Number(downPayment.value));

    $("#ratePreview").textContent =
        `${number(Number(annualRate.value))}%`;

    $("#monthsPreview").textContent =
        `${Number(months.value)} meses`;

}


function updateAllRanges() {

    syncRange(income, incomeRange);

    syncRange(amount, amountRange);

    syncRange(annualRate, rateRange);

    syncRange(months, monthsRange);

    updatePreviews();

}


/* =========================================================
   INPUT EVENTS
========================================================= */

income.addEventListener("input", () => {

    syncRange(income, incomeRange);

    updatePreviews();

    calculate();

});


amount.addEventListener("input", () => {

    syncRange(amount, amountRange);

    updatePreviews();

    calculate();

});


downPayment.addEventListener("input", () => {

    updatePreviews();

    calculate();

});


annualRate.addEventListener("input", () => {

    syncRange(annualRate, rateRange);

    updatePreviews();

    calculate();

});


months.addEventListener("input", () => {

    syncRange(months, monthsRange);

    updatePreviews();

    calculate();

});


incomeRange.addEventListener("input", () => {

    syncInput(incomeRange, income);

    updatePreviews();

    calculate();

});


amountRange.addEventListener("input", () => {

    syncInput(amountRange, amount);

    updatePreviews();

    calculate();

});


rateRange.addEventListener("input", () => {

    syncInput(rateRange, annualRate);

    updatePreviews();

    calculate();

});


monthsRange.addEventListener("input", () => {

    syncInput(monthsRange, months);

    updatePreviews();

    calculate();

});


/* =========================================================
   MATEMÁTICA FINANCEIRA
========================================================= */


/*
    Converte taxa anual efetiva para taxa mensal efetiva.

    i_m = (1 + i_a)^(1/12) - 1
*/

function annualToMonthly(annualRate) {

    return Math.pow(
        1 + annualRate / 100,
        1 / 12
    ) - 1;

}


/*
    PRICE

    PMT =
    PV * i * (1+i)^n
    -----------------
       (1+i)^n - 1
*/

function calculatePrice(
    principal,
    monthlyRate,
    totalMonths
) {

    if (monthlyRate === 0) {

        return principal / totalMonths;

    }

    const factor =
        Math.pow(
            1 + monthlyRate,
            totalMonths
        );

    return (
        principal *
        monthlyRate *
        factor /
        (factor - 1)
    );

}


/*
    Gera tabela PRICE.
*/

function generatePriceSchedule(
    principal,
    monthlyRate,
    totalMonths
) {

    const payment =
        calculatePrice(
            principal,
            monthlyRate,
            totalMonths
        );

    let balance = principal;

    let accumulatedInterest = 0;

    const schedule = [];

    for (
        let month = 1;
        month <= totalMonths;
        month++
    ) {

        const interest =
            balance * monthlyRate;

        let amortization =
            payment - interest;

        if (month === totalMonths) {

            amortization = balance;

        }

        const actualPayment =
            interest + amortization;

        balance -= amortization;

        if (balance < 0) {
            balance = 0;
        }

        accumulatedInterest += interest;

        schedule.push({

            month,

            payment: actualPayment,

            interest,

            amortization,

            balance,

            accumulatedInterest

        });

    }

    return schedule;

}


/*
    SAC

    Amortização constante:

    A = PV / n

    Parcela:

    PMT = A + juros
*/

function generateSacSchedule(
    principal,
    monthlyRate,
    totalMonths
) {

    const fixedAmortization =
        principal / totalMonths;

    let balance = principal;

    let accumulatedInterest = 0;

    const schedule = [];

    for (
        let month = 1;
        month <= totalMonths;
        month++
    ) {

        const interest =
            balance * monthlyRate;

        let amortization =
            fixedAmortization;

        if (month === totalMonths) {

            amortization = balance;

        }

        const payment =
            interest + amortization;

        balance -= amortization;

        if (balance < 0) {
            balance = 0;
        }

        accumulatedInterest += interest;

        schedule.push({

            month,

            payment,

            interest,

            amortization,

            balance,

            accumulatedInterest

        });

    }

    return schedule;

}


/* =========================================================
   MAIN CALCULATION
========================================================= */

function calculate(
    showToastMessage = false
) {

    const grossIncome =
        Number(income.value);

    const propertyAmount =
        Number(amount.value);

    const entry =
        Number(downPayment.value);

    const rate =
        Number(annualRate.value);

    const totalMonths =
        Number(months.value);


    /*
        Valor realmente financiado.
    */

    const principal =
        Math.max(
            propertyAmount - entry,
            0
        );


    /*
        Taxa mensal equivalente.
    */

    const monthlyRate =
        annualToMonthly(rate);


    /*
        Gera cronogramas.
    */

    const sac =
        generateSacSchedule(
            principal,
            monthlyRate,
            totalMonths
        );

    const price =
        generatePriceSchedule(
            principal,
            monthlyRate,
            totalMonths
        );


    /*
        Totais SAC.
    */

    const sacTotal =
        sac.reduce(
            (sum, row) =>
                sum + row.payment,
            0
        );

    const sacInterest =
        sac.reduce(
            (sum, row) =>
                sum + row.interest,
            0
        );


    /*
        Totais PRICE.
    */

    const priceTotal =
        price.reduce(
            (sum, row) =>
                sum + row.payment,
            0
        );

    const priceInterest =
        price.reduce(
            (sum, row) =>
                sum + row.interest,
            0
        );


    /*
        Limite de renda.
    */

    const incomeLimit =
        grossIncome * 0.30;


    /*
        Parcela inicial.
    */

    const sacFirst =
        sac[0]?.payment || 0;

    const sacLast =
        sac[sac.length - 1]?.payment || 0;

    const pricePayment =
        price[0]?.payment || 0;


    simulation = {

        income: grossIncome,

        propertyAmount,

        downPayment: entry,

        principal,

        annualRate: rate,

        monthlyRate,

        months: totalMonths,

        sac,

        price,

        sacFirst,

        sacLast,

        sacTotal,

        sacInterest,

        pricePayment,

        priceTotal,

        priceInterest,

        incomeLimit

    };


    updateResultCards();

    updateHealth();

    updateInsights();

    updateCharts();

    updateTable();

    updateQuickResult();


    if (showToastMessage) {

        showToast(
            "Simulação recalculada com sucesso."
        );

    }

}


/* =========================================================
   RESULT CARDS
========================================================= */

function updateResultCards() {

    if (!simulation) return;


    /*
        SAC
    */

    $("#sacFirst").textContent =
        money(simulation.sacFirst);

    $("#sacLast").textContent =
        money(simulation.sacLast);

    $("#sacInterest").textContent =
        money(simulation.sacInterest);

    $("#sacTotal").textContent =
        money(simulation.sacTotal);

    $("#sacAmortization").textContent =
        money(
            simulation.principal /
            simulation.months
        );


    /*
        PRICE
    */

    $("#priceInstallment").textContent =
        money(simulation.pricePayment);

    $("#priceFirst").textContent =
        money(simulation.pricePayment);

    $("#priceInterest").textContent =
        money(simulation.priceInterest);

    $("#priceTotal").textContent =
        money(simulation.priceTotal);

    $("#priceInitialInterest").textContent =
        money(simulation.price[0]?.interest);


    /*
        Commitment
    */

    const sacCommitment =
        simulation.income > 0
            ? simulation.sacFirst /
              simulation.income *
              100
            : 0;

    const priceCommitment =
        simulation.income > 0
            ? simulation.pricePayment /
              simulation.income *
              100
            : 0;


    $("#sacCommitment").textContent =
        percent(sacCommitment);

    $("#priceCommitment").textContent =
        percent(priceCommitment);


    $("#sacProgress").style.width =
        `${clamp(sacCommitment,0,100)}%`;

    $("#priceProgress").style.width =
        `${clamp(priceCommitment,0,100)}%`;


    /*
        Economia
    */

    const saving =
        Math.abs(
            simulation.priceInterest -
            simulation.sacInterest
        );

    $("#interestSaving").textContent =
        money(saving);

}


/* =========================================================
   QUICK RESULT
========================================================= */

function updateQuickResult() {

    const limit =
        simulation.incomeLimit;

    const price =
        simulation.pricePayment;

    const commitment =
        simulation.income > 0
            ? price / simulation.income * 100
            : 0;


    $("#recommendedInstallment").textContent =
        money(limit);

    $("#recommendationPercent").textContent =
        "30%";


    $("#quickAmount").textContent =
        money(simulation.principal);

    $("#quickMonths").textContent =
        `${simulation.months} meses`;

    $("#quickRate").textContent =
        percent(
            simulation.monthlyRate * 100
        );


    /*
        Status.
    */

    const status =
        $("#financialStatus");

    const title =
        $("#statusTitle");

    const description =
        $("#statusDescription");

    const symbol =
        status.querySelector(".status-symbol i");


    status.classList.remove(
        "safe",
        "warning",
        "danger"
    );


    if (commitment <= 30) {

        status.classList.add("safe");

        symbol.className =
            "fa-solid fa-check";

        title.textContent =
            "Perfil confortável";

        description.textContent =
            `A parcela representa ${number(commitment)}% `
            + "da sua renda, dentro do limite recomendado.";

    }
    else if (commitment <= 40) {

        status.classList.add("warning");

        symbol.className =
            "fa-solid fa-triangle-exclamation";

        title.textContent =
            "Atenção ao orçamento";

        description.textContent =
            `A parcela representa ${number(commitment)}% `
            + "da sua renda e ultrapassa o limite de 30%.";

    }
    else {

        status.classList.add("danger");

        symbol.className =
            "fa-solid fa-xmark";

        title.textContent =
            "Comprometimento elevado";

        description.textContent =
            `A parcela representa ${number(commitment)}% `
            + "da renda. Considere reduzir o valor financiado.";

    }

}


/* =========================================================
   FINANCIAL HEALTH
========================================================= */

function updateHealth() {

    const price =
        simulation.pricePayment;

    const income =
        simulation.income;

    const commitment =
        income > 0
            ? price / income * 100
            : 100;


    /*
        Score simplificado.

        0% = excelente
        30% = 100
        60%+ = 0
    */

    const score =
        clamp(
            Math.round(
                100 -
                (commitment / 60) * 100
            ),
            0,
            100
        );


    $("#healthScore").textContent =
        score;

    $("#healthIncome").textContent =
        money(income);

    $("#healthLimit").textContent =
        money(simulation.incomeLimit);

    $("#healthPayment").textContent =
        money(price);


    const fill =
        clamp(
            commitment / 60 * 100,
            0,
            100
        );

    $("#healthFill").style.width =
        `${fill}%`;


    const ring =
        $("#scoreRing");

    ring.style.background =
        `conic-gradient(
            ${score >= 70
                ? "var(--green)"
                : score >= 45
                    ? "var(--yellow)"
                    : "var(--red)"
            } ${score * 3.6}deg,
            rgba(255,255,255,.05)
            ${score * 3.6}deg
        )`;


    const label =
        $("#healthLabel");


    if (score >= 80) {

        label.textContent =
            "Excelente capacidade";

        label.style.color =
            "var(--green)";

    }
    else if (score >= 60) {

        label.textContent =
            "Boa capacidade";

        label.style.color =
            "var(--green)";

    }
    else if (score >= 40) {

        label.textContent =
            "Atenção necessária";

        label.style.color =
            "var(--yellow)";

    }
    else {

        label.textContent =
            "Comprometimento elevado";

        label.style.color =
            "var(--red)";

    }

}


/* =========================================================
   AI INSIGHTS
========================================================= */

function updateInsights() {

    const container =
        $("#insightsGrid");

    const {
        income,
        principal,
        months,
        annualRate,
        sacFirst,
        pricePayment,
        sacInterest,
        priceInterest
    } = simulation;


    const commitment =
        pricePayment /
        income *
        100;


    const saving =
        priceInterest -
        sacInterest;


    const bestMethod =
        sacInterest < priceInterest
            ? "SAC"
            : "PRICE";


    const insights = [];


    /*
        Insight 1
    */

    if (commitment <= 30) {

        insights.push({

            icon: "fa-shield-heart",

            title: "Parcela dentro do limite",

            text:
                `A parcela PRICE compromete `
                + `${number(commitment)}% da renda, `
                + "abaixo do limite de 30%."

        });

    }
    else {

        insights.push({

            icon: "fa-triangle-exclamation",

            title: "Parcela acima do recomendado",

            text:
                `O comprometimento estimado é de `
                + `${number(commitment)}%. `
                + "Considere aumentar a entrada ou o prazo."

        });

    }


    /*
        Insight 2
    */

    insights.push({

        icon: "fa-chart-line",

        title: `${bestMethod} tem menor custo de juros`,

        text:
            `No prazo selecionado, a diferença estimada `
            + `de juros é ${money(Math.abs(saving))}.`

    });


    /*
        Insight 3
    */

    if (sacFirst > pricePayment) {

        insights.push({

            icon: "fa-arrow-down",

            title: "PRICE começa mais leve",

            text:
                "A PRICE apresenta uma parcela inicial menor, "
                + "mas mantém juros maiores durante o financiamento."

        });

    }
    else {

        insights.push({

            icon: "fa-bolt",

            title: "SAC começa mais alto",

            text:
                "A SAC começa com uma parcela maior, "
                + "mas reduz o saldo devedor de forma mais rápida."

        });

    }


    /*
        Insight 4
    */

    if (annualRate > 15) {

        insights.push({

            icon: "fa-percent",

            title: "Taxa relativamente elevada",

            text:
                "Uma taxa anual alta aumenta significativamente "
                + "o custo final. Vale comparar instituições."

        });

    }
    else {

        insights.push({

            icon: "fa-percent",

            title: "Taxa utilizada na simulação",

            text:
                `Você está simulando uma taxa de `
                + `${number(annualRate)}% ao ano.`

        });

    }


    /*
        Insight 5
    */

    if (months >= 360) {

        insights.push({

            icon: "fa-calendar",

            title: "Prazo bastante longo",

            text:
                "Prazos longos reduzem a parcela, "
                + "mas normalmente aumentam bastante os juros totais."

        });

    }
    else {

        insights.push({

            icon: "fa-hourglass-half",

            title: "Prazo relativamente enxuto",

            text:
                `O financiamento será quitado em `
                + `${months} meses, reduzindo a exposição aos juros.`

        });

    }


    /*
        Insight 6
    */

    const entryPercent =
        simulation.propertyAmount > 0
            ? simulation.downPayment /
              simulation.propertyAmount *
              100
            : 0;


    insights.push({

        icon: "fa-coins",

        title: "Entrada analisada",

        text:
            `Sua entrada representa `
            + `${number(entryPercent)}% do valor informado.`

    });


    container.innerHTML =
        insights
            .slice(0, 6)
            .map(item => `

                <div class="insight-card">

                    <i class="fa-solid ${item.icon}"></i>

                    <div>

                        <strong>
                            ${item.title}
                        </strong>

                        <p>
                            ${item.text}
                        </p>

                    </div>

                </div>

            `)
            .join("");

}


/* =========================================================
   CHARTS
========================================================= */

function getChartColors() {

    const light =
        document.body.classList.contains("light");

    return {

        text:
            light
                ? "#40516a"
                : "#a8b7cc",

        grid:
            light
                ? "rgba(20,60,100,.08)"
                : "rgba(255,255,255,.05)"

    };

}


function createMainChart(type = "balance") {

    const canvas =
        $("#mainChart");

    if (mainChart) {

        mainChart.destroy();

    }


    const colors =
        getChartColors();


    const sac =
        simulation.sac;

    const price =
        simulation.price;


    /*
        Reduzimos pontos para deixar
        o gráfico mais leve.
    */

    const step =
        simulation.months > 180
            ? 6
            : 3;


    const selectedRows =
        sac.filter(
            (_, index) =>
                index % step === 0
                ||
                index === sac.length - 1
        );


    const labels =
        selectedRows.map(
            row => `Mês ${row.month}`
        );


    let sacData;
    let priceData;


    if (type === "balance") {

        sacData =
            selectedRows.map(
                row => row.balance
            );

        priceData =
            selectedRows.map(
                row =>
                    price[row.month - 1]?.balance || 0
            );

    }
    else if (type === "payment") {

        sacData =
            selectedRows.map(
                row => row.payment
            );

        priceData =
            selectedRows.map(
                row =>
                    price[row.month - 1]?.payment || 0
            );

    }
    else {

        sacData =
            selectedRows.map(
                row =>
                    row.interest
            );

        priceData =
            selectedRows.map(
                row =>
                    price[row.month - 1]?.interest || 0
            );

    }


    mainChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels,

                    datasets: [

                        {

                            label: "SAC",

                            data: sacData,

                            borderColor:
                                "#36a9ff",

                            backgroundColor:
                                "rgba(54,169,255,.10)",

                            borderWidth: 2,

                            pointRadius: 0,

                            pointHoverRadius: 5,

                            tension: .3,

                            fill: true

                        },

                        {

                            label: "PRICE",

                            data: priceData,

                            borderColor:
                                "#a78bfa",

                            backgroundColor:
                                "rgba(167,139,250,.08)",

                            borderWidth: 2,

                            pointRadius: 0,

                            pointHoverRadius: 5,

                            tension: .3,

                            fill: true

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {

                        mode: "index",

                        intersect: false

                    },

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            backgroundColor:
                                "#071426",

                            borderColor:
                                "rgba(255,255,255,.1)",

                            borderWidth: 1,

                            padding: 12,

                            callbacks: {

                                label:
                                    context =>
                                        `${context.dataset.label}: `
                                        + `${money(context.parsed.y)}`

                            }

                        }

                    },

                    scales: {

                        x: {

                            grid: {

                                color:
                                    colors.grid

                            },

                            ticks: {

                                color:
                                    colors.text,

                                maxTicksLimit: 10,

                                font: {
                                    size: 9
                                }

                            }

                        },

                        y: {

                            grid: {

                                color:
                                    colors.grid

                            },

                            ticks: {

                                color:
                                    colors.text,

                                font: {
                                    size: 9
                                },

                                callback:
                                    value =>
                                        money(value)

                            }

                        }

                    }

                }

            }

        );

}


function updateCharts() {

    createMainChart("balance");

    createSecondaryCharts();

}


/* =========================================================
   SECONDARY CHARTS
========================================================= */

function createSecondaryCharts() {

    const colors =
        getChartColors();


    if (compositionChart) {

        compositionChart.destroy();

    }


    if (totalChart) {

        totalChart.destroy();

    }


    /*
        Composition.

        Total de juros x amortização.
    */

    compositionChart =
        new Chart(
            $("#compositionChart"),
            {

                type: "doughnut",

                data: {

                    labels: [
                        "Juros",
                        "Amortização"
                    ],

                    datasets: [

                        {

                            data: [

                                simulation.sacInterest,

                                simulation.principal

                            ],

                            backgroundColor: [

                                "#ff5574",

                                "#1687ff"

                            ],

                            borderWidth: 0,

                            hoverOffset: 7

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "72%",

                    plugins: {

                        legend: {

                            position: "bottom",

                            labels: {

                                color:
                                    colors.text,

                                font: {
                                    size: 9
                                },

                                usePointStyle: true,

                                padding: 20

                            }

                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    context =>
                                        `${context.label}: `
                                        + `${money(context.parsed)}`

                            }

                        }

                    }

                }

            }

        );


    /*
        Total pago acumulado.
    */

    const step =
        simulation.months > 180
            ? 12
            : 6;


    const sacRows =
        simulation.sac.filter(
            (_, index) =>
                index % step === 0
        );


    const labels =
        sacRows.map(
            row =>
                `Mês ${row.month}`
        );


    let sacAccumulated = 0;

    let priceAccumulated = 0;


    const sacTotals = [];

    const priceTotals = [];


    sacRows.forEach(row => {

        sacAccumulated += row.payment;

        priceAccumulated +=
            simulation.price[row.month - 1]?.payment || 0;

        sacTotals.push(sacAccumulated);

        priceTotals.push(priceAccumulated);

    });


    totalChart =
        new Chart(
            $("#totalChart"),
            {

                type: "line",

                data: {

                    labels,

                    datasets: [

                        {

                            label: "SAC",

                            data: sacTotals,

                            borderColor:
                                "#20e59a",

                            backgroundColor:
                                "rgba(32,229,154,.08)",

                            fill: true,

                            tension: .3,

                            pointRadius: 0

                        },

                        {

                            label: "PRICE",

                            data: priceTotals,

                            borderColor:
                                "#8b5cf6",

                            backgroundColor:
                                "rgba(139,92,246,.07)",

                            fill: true,

                            tension: .3,

                            pointRadius: 0

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            display: false

                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    context =>
                                        `${context.dataset.label}: `
                                        + `${money(context.parsed.y)}`

                            }

                        }

                    },

                    scales: {

                        x: {

                            grid: {
                                color: colors.grid
                            },

                            ticks: {
                                color: colors.text,
                                font: {
                                    size: 8
                                }
                            }

                        },

                        y: {

                            grid: {
                                color: colors.grid
                            },

                            ticks: {

                                color: colors.text,

                                font: {
                                    size: 8
                                },

                                callback:
                                    value =>
                                        money(value)

                            }

                        }

                    }

                }

            }

        );

}


/* =========================================================
   CHART TABS
========================================================= */

$$(".chart-tab").forEach(button => {

    button.addEventListener(
        "click",
        () => {

            $$(".chart-tab")
                .forEach(btn =>
                    btn.classList.remove("active")
                );

            button.classList.add("active");

            const type =
                button.dataset.chart;


            if (type === "balance") {

                $("#chartTitle").textContent =
                    "Evolução do saldo devedor";

                $("#chartSubtitle").textContent =
                    "SAC x PRICE ao longo do tempo";

            }
            else if (type === "payment") {

                $("#chartTitle").textContent =
                    "Evolução das parcelas";

                $("#chartSubtitle").textContent =
                    "Como o valor mensal se comporta";

            }
            else {

                $("#chartTitle").textContent =
                    "Evolução dos juros";

                $("#chartSubtitle").textContent =
                    "Parcela de juros ao longo do financiamento";

            }


            createMainChart(type);

        }

    );

});


/* =========================================================
   TABLE
========================================================= */

function updateTable() {

    const schedule =
        currentTableMethod === "sac"
            ? simulation.sac
            : simulation.price;


    const search =
        $("#tableSearch")
            .value
            .toLowerCase()
            .trim();


    let filtered =
        schedule.filter(row => {

            if (!search) return true;

            return String(row.month)
                .includes(search);

        });


    const visible =
        filtered.slice(
            0,
            visibleRows
        );


    const body =
        $("#amortizationBody");


    body.innerHTML =
        visible
            .map(row => `

                <tr>

                    <td>
                        <strong>
                            ${row.month}
                        </strong>
                    </td>

                    <td>
                        ${money(row.payment)}
                    </td>

                    <td>
                        ${money(row.interest)}
                    </td>

                    <td>
                        ${money(row.amortization)}
                    </td>

                    <td>
                        ${money(row.balance)}
                    </td>

                    <td>
                        ${money(row.accumulatedInterest)}
                    </td>

                </tr>

            `)
            .join("");


    $("#tableCounter").textContent =
        `${visible.length} de ${filtered.length} parcelas`;

}


$("#tableMethod")
    .addEventListener(
        "change",
        event => {

            currentTableMethod =
                event.target.value;

            visibleRows = 12;

            updateTable();

        }
    );


$("#tableSearch")
    .addEventListener(
        "input",
        () => {

            visibleRows = 12;

            updateTable();

        }
    );


$("#loadMore")
    .addEventListener(
        "click",
        () => {

            visibleRows += 12;

            updateTable();

        }
    );


/* =========================================================
   THEME
========================================================= */

function setTheme(theme) {

    if (theme === "light") {

        document.body.classList.add("light");

        $("#themeToggle").innerHTML =
            `<i class="fa-solid fa-sun"></i>`;

    }
    else {

        document.body.classList.remove("light");

        $("#themeToggle").innerHTML =
            `<i class="fa-solid fa-moon"></i>`;

    }

    localStorage.setItem(
        "finnaitheme",
        theme
    );


    /*
        Atualiza gráficos porque
        as cores dos eixos mudam.
    */

    if (simulation) {

        const active =
            $(".chart-tab.active");

        createMainChart(
            active?.dataset.chart || "balance"
        );

        createSecondaryCharts();

    }

}


$("#themeToggle")
    .addEventListener(
        "click",
        () => {

            const isLight =
                document.body
                    .classList
                    .contains("light");

            setTheme(
                isLight
                    ? "dark"
                    : "light"
            );

        }
    );


/* =========================================================
   LOCAL STORAGE
========================================================= */

function saveSimulation() {

    const data = {

        income: income.value,

        amount: amount.value,

        downPayment:
            downPayment.value,

        annualRate:
            annualRate.value,

        months:
            months.value

    };


    localStorage.setItem(
        "finnaisimulation",
        JSON.stringify(data)
    );

}


function loadSimulation() {

    const saved =
        localStorage.getItem(
            "finnaisimulation"
        );


    if (!saved) {

        income.value =
            DEFAULTS.income;

        amount.value =
            DEFAULTS.amount;

        downPayment.value =
            DEFAULTS.downPayment;

        annualRate.value =
            DEFAULTS.annualRate;

        months.value =
            DEFAULTS.months;

        return;

    }


    try {

        const data =
            JSON.parse(saved);

        income.value =
            data.income;

        amount.value =
            data.amount;

        downPayment.value =
            data.downPayment;

        annualRate.value =
            data.annualRate;

        months.value =
            data.months;

    }
    catch {

        console.warn(
            "Não foi possível recuperar a simulação."
        );

    }

}


/* =========================================================
   CALCULATE BUTTON
========================================================= */

$("#calculateButton")
    .addEventListener(
        "click",
        () => {

            calculate(true);

            saveSimulation();

            $("#results")
                ?.scrollIntoView({
                    behavior: "smooth"
                });

        }
    );


/* =========================================================
   RESET
========================================================= */

$("#resetButton")
    .addEventListener(
        "click",
        () => {

            income.value =
                DEFAULTS.income;

            amount.value =
                DEFAULTS.amount;

            downPayment.value =
                DEFAULTS.downPayment;

            annualRate.value =
                DEFAULTS.annualRate;

            months.value =
                DEFAULTS.months;


            updateAllRanges();

            calculate();

            saveSimulation();

            showToast(
                "Simulação restaurada."
            );

        }
    );


/* =========================================================
   RANDOM / SMART SIMULATION
========================================================= */

$("#randomSimulation")
    .addEventListener(
        "click",
        () => {

            /*
                Exemplo de perfil
                equilibrado.
            */

            const profiles = [

                {
                    income: 6500,
                    amount: 220000,
                    entry: 45000,
                    rate: 10.5,
                    months: 240
                },

                {
                    income: 10000,
                    amount: 380000,
                    entry: 80000,
                    rate: 9.8,
                    months: 300
                },

                {
                    income: 15000,
                    amount: 550000,
                    entry: 120000,
                    rate: 9.2,
                    months: 360
                },

                {
                    income: 5000,
                    amount: 180000,
                    entry: 40000,
                    rate: 11.2,
                    months: 240
                }

            ];


            const profile =
                profiles[
                    Math.floor(
                        Math.random() *
                        profiles.length
                    )
                ];


            income.value =
                profile.income;

            amount.value =
                profile.amount;

            downPayment.value =
                profile.entry;

            annualRate.value =
                profile.rate;

            months.value =
                profile.months;


            updateAllRanges();

            calculate();

            saveSimulation();

            showToast(
                "Perfil inteligente carregado."
            );

        }
    );


/* =========================================================
   EXPORT
========================================================= */

$("#exportButton")
    .addEventListener(
        "click",
        () => {

            if (!simulation) return;


            const text = `

FINNAI
SIMULAÇÃO DE FINANCIAMENTOS

========================================

DADOS

Renda mensal:
${money(simulation.income)}

Valor do imóvel/financiamento:
${money(simulation.propertyAmount)}

Entrada:
${money(simulation.downPayment)}

Valor financiado:
${money(simulation.principal)}

Taxa anual:
${percent(simulation.annualRate)}

Taxa mensal equivalente:
${percent(simulation.monthlyRate * 100)}

Prazo:
${simulation.months} meses


========================================

SAC

Primeira parcela:
${money(simulation.sacFirst)}

Última parcela:
${money(simulation.sacLast)}

Total de juros:
${money(simulation.sacInterest)}

Total pago:
${money(simulation.sacTotal)}


========================================

PRICE

Parcela:
${money(simulation.pricePayment)}

Total de juros:
${money(simulation.priceInterest)}

Total pago:
${money(simulation.priceTotal)}


========================================

FinnAI

Limite recomendado:
${money(simulation.incomeLimit)}

Economia estimada de juros:
${money(
    Math.abs(
        simulation.priceInterest -
        simulation.sacInterest
    )
)}

========================================

Aviso:
Esta simulação é educativa e não constitui
recomendação financeira.

`;


            const blob =
                new Blob(
                    [text],
                    {
                        type:
                            "text/plain;charset=utf-8"
                    }
                );


            const url =
                URL.createObjectURL(blob);


            const link =
                document.createElement("a");


            link.href = url;

            link.download =
                "FinnAI-Simulacao.txt";


            link.click();


            URL.revokeObjectURL(url);


            showToast(
                "Simulação exportada."
            );

        }
    );


/* =========================================================
   SELIC - BANCO CENTRAL
========================================================= */


/*
    O SGS do Banco Central disponibiliza
    séries temporais econômicas.

    O código tenta consultar uma série pública.

    Como APIs públicas podem sofrer indisponibilidade,
    existe um fallback visual.
*/

async function loadSelic() {

    const valueElement =
        $("#selicValue");

    const headerElement =
        $("#headerSelic");

    try {

        /*
            Série 1178:
            Taxa Selic definida pelo Copom
            - valores de referência.

            A disponibilidade pode variar conforme
            a série e o endpoint.
        */

        const url =
            "https://api.bcb.gov.br/dados/serie/bcdata.sgs.1178/dados?formato=json";

        const response =
            await fetch(url, {
                method: "GET"
            });


        if (!response.ok) {

            throw new Error(
                "Falha ao consultar o Banco Central."
            );

        }


        const data =
            await response.json();


        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {

            throw new Error(
                "Nenhum dado encontrado."
            );

        }


        const latest =
            data[data.length - 1];


        const latestValue =
            Number(
                String(latest.valor)
                    .replace(",", ".")
            );


        if (
            Number.isNaN(latestValue)
        ) {

            throw new Error(
                "Valor inválido."
            );

        }


        valueElement.textContent =
            `${number(latestValue)}%`;

        headerElement.textContent =
            `${number(latestValue)}%`;


        $("#selicDate").textContent =
            `Referência: ${latest.data}`;


    }
    catch (error) {

        console.warn(
            "SELIC API:",
            error
        );


        /*
            Fallback para evitar
            quebrar a interface.
        */

        valueElement.textContent =
            "--";

        headerElement.textContent =
            "--";

        $("#selicDate").textContent =
            "Consulta indisponível no momento.";

    }

}


/* =========================================================
   TOAST
========================================================= */

let toastTimeout;


function showToast(message) {

    const toast =
        $("#toast");

    $("#toastMessage")
        .textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimeout
    );


    toastTimeout =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );

}


/* =========================================================
   SCROLL BUTTON
========================================================= */

$("#scrollSimulator")
    .addEventListener(
        "click",
        () => {

            $("#simulator")
                .scrollIntoView({
                    behavior: "smooth"
                });

        }
    );


/* =========================================================
   PARTICLES
========================================================= */

function initParticles() {

    const canvas =
        $("#particlesCanvas");

    const ctx =
        canvas.getContext("2d");


    let width;
    let height;

    let particles = [];


    function resize() {

        width =
            canvas.width =
                window.innerWidth;

        height =
            canvas.height =
                window.innerHeight;

    }


    function createParticles() {

        particles = [];


        const count =
            Math.min(
                80,
                Math.floor(
                    window.innerWidth / 18
                )
            );


        for (
            let i = 0;
            i < count;
            i++
        ) {

            particles.push({

                x:
                    Math.random() *
                    width,

                y:
                    Math.random() *
                    height,

                size:
                    Math.random() *
                    1.5 + .3,

                speed:
                    Math.random() *
                    .25 + .05,

                opacity:
                    Math.random() *
                    .4 + .1

            });

        }

    }


    function draw() {

        ctx.clearRect(
            0,
            0,
            width,
            height
        );


        const light =
            document.body
                .classList
                .contains("light");


        particles.forEach(p => {

            p.y -= p.speed;


            if (p.y < -10) {

                p.y =
                    height + 10;

                p.x =
                    Math.random() *
                    width;

            }


            ctx.beginPath();

            ctx.arc(
                p.x,
                p.y,
                p.size,
                0,
                Math.PI * 2
            );


            ctx.fillStyle =
                light
                    ? `rgba(20,100,190,${p.opacity * .35})`
                    : `rgba(80,180,255,${p.opacity})`;


            ctx.fill();

        });


        requestAnimationFrame(
            draw
        );

    }


    resize();

    createParticles();

    draw();


    window.addEventListener(
        "resize",
        () => {

            resize();

            createParticles();

        }
    );

}


/* =========================================================
   REVEAL ANIMATION
========================================================= */

function initReveal() {

    const elements =
        document.querySelectorAll(
            "section"
        );


    elements.forEach(
        element =>
            element.classList.add(
                "reveal"
            )
    );


    const observer =
        new IntersectionObserver(
            entries => {

                entries.forEach(
                    entry => {

                        if (
                            entry.isIntersecting
                        ) {

                            entry.target
                                .classList
                                .add("visible");

                        }

                    }
                );

            },
            {
                threshold: .08
            }
        );


    elements.forEach(
        element =>
            observer.observe(element)
    );

}


/* =========================================================
   MOUSE PARALLAX
========================================================= */

function initParallax() {

    const orb =
        document.querySelector(".orb");


    if (!orb) return;


    window.addEventListener(
        "mousemove",
        event => {

            const x =
                (event.clientX /
                    window.innerWidth -
                    .5) * 12;

            const y =
                (event.clientY /
                    window.innerHeight -
                    .5) * 12;


            orb.style.transform =
                `translate(${x}px, ${y}px)`;

        }
    );

}


/* =========================================================
   AUTO UPDATE
========================================================= */

function initAutoCalculation() {

    const inputs = [
        income,
        amount,
        downPayment,
        annualRate,
        months
    ];


    inputs.forEach(
        input => {

            input.addEventListener(
                "change",
                () => {

                    calculate();

                    saveSimulation();

                }
            );

        }
    );

}


/* =========================================================
   INITIALIZATION
========================================================= */

function init() {

    /*
        Tema.
    */

    const savedTheme =
        localStorage.getItem(
            "finnaitheme"
        );


    setTheme(
        savedTheme || "dark"
    );


    /*
        Recupera simulação.
    */

    loadSimulation();


    /*
        Sincroniza controles.
    */

    updateAllRanges();


    /*
        Calcula.
    */

    calculate();


    /*
        API.
    */

    loadSelic();


    /*
        Visual.
    */

    initParticles();

    initReveal();

    initParallax();

    initAutoCalculation();


    /*
        Atualização periódica
        da SELIC.
    */

    setInterval(
        loadSelic,
        30 * 60 * 1000
    );

}


document.addEventListener(
    "DOMContentLoaded",
    init
);