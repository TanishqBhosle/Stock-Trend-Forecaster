# Product Requirements Document (PRD)

## Stock Trend Forecaster

**Document status:** Product specification\
**Project duration:** 12 weeks\
**Project theme:** Financial AI\
**Primary model:** Long Short-Term Memory (LSTM) time-series model\
**Backend:** FastAPI\
**Frontend:** React\
**Primary dataset:** S&P 500 historical prices (actual coverage and
schema to be verified)\
**Primary evaluation metrics:** RMSE and Directional Accuracy

------------------------------------------------------------------------

## 1. Product Overview

### 1.1 Product Vision

Stock Trend Forecaster is a financial time-series forecasting and
decision-support application. It uses historical stock-market OHLCV
(Open, High, Low, Close, Volume) observations to predict the next
trading day's closing price and derive a **Bullish**, **Neutral**, or
**Bearish** trend signal.

The application exposes the forecasting pipeline through a FastAPI REST
API and presents historical prices, forecasts, trend signals, model
evaluation, and backtesting evidence through an interactive React
dashboard.

The product must present forecasts with supporting context and
limitations. A prediction must never be presented as a certain outcome.

### 1.2 Problem Statement

Retail traders and analysts often inspect large volumes of historical
market data to understand possible future price movements. Manually
identifying temporal patterns across these datasets can be difficult and
inconsistent.

Stock Trend Forecaster aims to provide: - A repeatable machine-learning
forecast based on historical OHLCV sequences. - A clear next-day price
estimate and directional signal. - Historical model-performance
evidence. - Walk-forward evaluation and baseline comparison. -
Historical simulation of model-generated signals.

### 1.3 Product Goals

1.  Build an LSTM model using historical OHLCV data.
2.  Forecast the next trading day's closing price.
3.  Derive a next-day direction and trend signal.
4.  Evaluate price predictions using RMSE and supporting regression
    metrics.
5.  Evaluate direction using Directional Accuracy.
6.  Use chronological and walk-forward validation.
7.  Compare the LSTM with simple forecasting baselines.
8.  Provide a historical backtesting engine.
9.  Expose forecasts and model information through FastAPI.
10. Provide an interactive React dashboard.
11. Support basic authentication and user-session handling.
12. Document model assumptions, limitations, experiments, and
    reproducibility.

### 1.4 Product Principles

-   Forecast first; decision second.
-   Never claim certainty.
-   Show evidence alongside predictions.
-   Use time-aware validation.
-   Prevent data leakage.
-   Version models and preprocessing artifacts.
-   Make backtesting assumptions explicit.
-   Keep human judgment in the loop.

------------------------------------------------------------------------

## 2. Target Users and Personas

  -----------------------------------------------------------------------
  Persona                 Goals                   Pain Points
  ----------------------- ----------------------- -----------------------
  Retail Trader           Understand possible     Manually analyzing
                          next-day market         large historical
                          direction and review a  datasets is
                          stock's historical      time-consuming.
                          trend.                  

  Quant Analyst           Evaluate forecasting    Needs reproducible
                          signals and inspect     evaluation and
                          backtest results.       transparent backtesting
                                                  assumptions.

  Data Scientist          Study financial         Needs rigorous
                          time-series modelling   time-aware validation
                          and compare model       and leakage prevention.
                          performance.            
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 3. Product Scope

### 3.1 MVP Scope

The MVP includes:

-   S&P 500 historical price data ingestion.
-   Dataset and OHLCV validation.
-   Exploratory Data Analysis (EDA).
-   Leakage-safe preprocessing and feature/sequence preparation.
-   A simple baseline forecasting model.
-   An LSTM forecasting model.
-   Chronological train/validation/test evaluation.
-   Walk-forward validation.
-   RMSE, MAE, and Directional Accuracy reporting.
-   Bullish/Neutral/Bearish signal generation.
-   Historical backtesting.
-   FastAPI REST service.
-   React dashboard.
-   Basic authentication and user-session handling.
-   Model card and model version metadata.
-   Unit, integration, API, and UI tests.
-   README, architecture documentation, and deployment.

### 3.2 Should-Have Features

-   Prediction history.
-   User watchlist.
-   Multi-stock portfolio-level trend dashboard.

### 3.3 Out of Scope

The product is not: - An automated trading execution system. - A
brokerage platform. - A guaranteed-profit system. - A financial advisory
service. - A system that guarantees future market direction. - A
portfolio-management service.

News, social sentiment, macroeconomic events, and company fundamentals
are outside the mandatory MVP unless explicitly introduced as a later
extension.

### 3.4 Product Boundary and Disclaimer

This product is a financial forecasting and decision-support prototype.
It provides model-generated estimates from historical data, not
investment instructions. Market conditions can change, historical
patterns may not persist, and predictions may be wrong. The UI and
documentation must communicate uncertainty and historical limitations
clearly.

------------------------------------------------------------------------

## 4. Data and Modelling Requirements

### 4.1 Data Source and Dataset Assumptions

The project uses the S&P 500 historical prices dataset specified for the
project.

The following values must be established by inspecting the actual
dataset and must not be invented: - Dataset source and version. - Ticker
coverage and number of stocks. - Date range and number of
observations. - Exact column schema and feature availability. - Missing
values and duplicate records. - Data frequency and market-calendar
gaps. - Target distribution and stock coverage.

Historical OHLCV is the primary model input. Dataset facts must be
documented after inspection.

### 4.2 Data Validation

The pipeline must: - Validate required columns and data types. - Check
missing values and duplicate records. - Check numeric values and
plausible ranges. - Validate dates and chronological ordering. -
Identify unavailable or incomplete ticker histories. - Handle missing
data explicitly and document the chosen handling method. - Produce a
clear error when requested data is unavailable.

### 4.3 Exploratory Data Analysis

EDA should cover:

**Price behaviour** - Closing-price distribution. - OHLC
relationships. - Price trends over time.

**Volume** - Volume distribution. - Volume-price relationship.

**Returns and volatility** - Daily return distribution. - Positive
versus negative days. - Volatility and extreme movements.

Daily return for analysis:

\[ DailyReturn_t = `\frac{Close_t - Close_{t-1}}{Close_{t-1}}`{=tex} \]

**Correlation** - Relationships among available numerical features. -
Correlation must be interpreted as association, not causation.

**Time characteristics** - Trends. - Volatility changes. - Missing
periods. - Market-regime differences.

EDA findings and visualizations must be documented.

### 4.4 Forecasting Problem

The project is formulated as supervised financial time-series
regression.

Given a sequence of historical observations:

\[ X\_{t-n}, `\ldots`{=tex}, X\_{t-2}, X\_{t-1}, X_t \]

the model predicts:

\[ `\widehat{Close}`{=tex}\_{t+1} \]

The predicted closing price is then compared with the latest known close
to derive expected movement and a directional signal.

### 4.5 Feature and Sequence Requirements

The source specification identifies OHLCV as the initial feature set:

-   Open
-   High
-   Low
-   Close
-   Volume

It also lists optional engineered features such as Daily Return, Price
Range, Moving Average, Rolling Volatility, RSI, MACD, and Volume Change.
The model-card example also mentions OHLCV plus SMA, RSI, and MACD.

**Product requirement:** The final feature set must be explicitly
selected, documented, and versioned before training. Any engineered
feature must be computed without future information. The exact feature
list used by a deployed model must be returned in model metadata.
Optional indicators are not automatically required by the MVP.

Initial sequence configuration: - Lookback window: 60 trading days. -
The lookback window must remain configurable for experimentation. - Each
sequence must contain only observations available at or before its
prediction date.

### 4.6 Preprocessing and Leakage Prevention

-   Scaling is required for stable neural-network training.
-   Fit preprocessing/scalers on training data only.
-   Apply the fitted transformations to validation and test data.
-   Do not fit or tune preprocessing using the final test period.
-   Feature engineering must be time-aware and must not use future
    information.
-   Sequence generation must preserve chronological ordering.

Correct workflow:

`Training Data → Fit Scaler → Transform Training → Transform Validation/Test`

Incorrect workflow:

`Entire Dataset → Fit Scaler → Train/Test`

### 4.7 Baseline Model

At least one simple baseline must be implemented and evaluated.

**Naive baseline**

\[ PredictedClose\_{t+1} = Close_t \]

A moving-average baseline may be added as an optional comparison:

\[ Prediction = Recent N`\text{-day average}`{=tex} \]

Baseline metrics must be recorded and compared with the LSTM to
determine whether the LSTM adds value.

### 4.8 LSTM Model

Initial model architecture:

`Input Features → LSTM → Dropout → LSTM → Dropout → Fully Connected Layer → Predicted Close`

Initial experimental configuration:

  Parameter                      Initial Value
  ----------------- --------------------------
  Sequence length                           60
  Hidden size                              128
  LSTM layers                                2
  Dropout                                  0.2
  Output size                                1
  Optimizer                               Adam
  Loss                Mean Squared Error (MSE)

These are initial experimental settings, not measured or guaranteed
optimal values.

### 4.9 Hyperparameter Tuning

Candidate search ranges:

  Parameter         Candidate Values
  ----------------- -------------------------
  Sequence length   30 / 60 / 90
  Hidden size       64 / 128 / 256
  LSTM layers       1 / 2 / 3
  Dropout           0.1 / 0.2 / 0.3
  Learning rate     Configurable candidates
  Batch size        Configurable candidates
  Epochs            Configurable

-   Tuning must use training and validation data only.
-   Do not tune against the final test set.
-   Reduce the search space if computational resources are limited.
-   Use early stopping where appropriate.
-   Record each experiment and its configuration.

### 4.10 Time-Series Validation

Primary evaluation must be chronological. Random splitting must not be
used for the primary financial time-series evaluation.

The project uses: - A chronological train/validation/test split. - A
final test period that remains untouched until final evaluation. -
Expanding walk-forward evaluation, where each fold trains on earlier
data and evaluates on a later period.

Example: - Fold 1: Train on an earlier period → test on a later
period. - Fold 2: Expand the training period → test on a subsequent
period. - Fold 3: Expand the training period again → test on a
subsequent period.

Exact fold dates and sizes must be determined from the available dataset
and documented.

### 4.11 Evaluation Metrics

**Required: RMSE**

\[ RMSE = `\sqrt{mean((Actual - Predicted)^2)}`{=tex} \]

Lower RMSE indicates smaller prediction error in the target's units.

**Required: Directional Accuracy**

-   Actual direction: `Close(t+1) > Close(t)`
-   Predicted direction: `Predicted Close(t+1) > Close(t)`

\[ DirectionalAccuracy =
`\frac{CorrectDirectionPredictions}{TotalPredictions}`{=tex}
`\times 100`{=tex} \]

**Additional metrics** - MAE. - Up-direction accuracy. - Down-direction
accuracy. - Confusion matrix. - Precision and recall for direction
classification. - Fold-level metrics.

Actual metric values must come from completed experiments. Do not
hardcode illustrative values as measured results.

### 4.12 Trend Signal

The forecast is mapped to one of three signals:

-   **BULLISH:** Predicted return is above the positive threshold.
-   **NEUTRAL:** Predicted return lies between the negative and positive
    thresholds.
-   **BEARISH:** Predicted return is below the negative threshold.

The threshold methodology must be documented and selected using
training/validation data. It must not be optimized against the final
test set.

The source specification gives an example threshold of +0.5% and -0.5%
in its model-card/API example. Treat this as an example configuration
unless it is formally selected and validated for the final model.

### 4.13 Error Analysis and Explainability

The system should provide practical transparency through: -
Input-feature documentation. - Historical context. -
Actual-versus-predicted visualizations. - Error analysis. - Prediction
history. - Model configuration and version. - Backtest evidence.

Error analysis should investigate: - Unusually large absolute price
errors. - False bullish signals. - False bearish signals. - Missed
movements. - Neutral predictions. - Performance during stable,
high-volatility, upward-trending, and downward-trending periods.

Optional feature-sensitivity or input-perturbation analysis must not be
presented as causal explanation.

### 4.14 Experiment Tracking

Each experiment must record: - Experiment ID. - Dataset version. -
Feature set. - Sequence length. - Hidden size. - Number of LSTM
layers. - Dropout. - Learning rate. - Batch size. - Training period. -
Validation strategy. - Training loss. - Validation loss. - RMSE. -
MAE. - Directional Accuracy. - Model version.

------------------------------------------------------------------------

## 5. Functional Requirements

Priority definitions: - **Must:** Required for the MVP. - **Should:**
Valuable feature, but not required to complete the core forecasting
workflow.

  --------------------------------------------------------------------------------------
  ID                Requirement              Priority          Acceptance Criteria
  ----------------- ------------------------ ----------------- -------------------------
  BR-001            Ingest S&P 500           Must              Dataset source and
                    historical price data                      version are documented.

  BR-002            Validate OHLCV data      Must              Missingness, duplicates,
                                                               data types, and ranges
                                                               are checked.

  BR-003            Perform EDA              Must              Findings and
                                                               visualizations are
                                                               documented.

  BR-004            Create forecasting       Must              Feature pipeline is
                    features                                   leakage-safe and
                                                               versioned.

  BR-005            Establish baseline       Must              Baseline metrics are
                                                               recorded.

  BR-006            Train LSTM               Must              A versioned model
                                                               artifact is produced.

  BR-007            Perform walk-forward     Must              Chronological evaluation
                    validation                                 is completed.

  BR-008            Calculate RMSE           Must              Test metric is recorded.

  BR-009            Calculate Directional    Must              Directional metric is
                    Accuracy                                   recorded.

  BR-010            Generate trend signal    Must              Bullish/Neutral/Bearish
                                                               mapping is documented.

  BR-011            Build backtesting engine Must              Historical signals can be
                                                               simulated.

  BR-012            Build FastAPI service    Must              Forecast API works.

  BR-013            Build React dashboard    Must              End-to-end prediction is
                                                               visible.

  BR-014            Add basic                Must              User-specific
                    authentication/session                     functionality is
                    handling                                   protected.

  BR-015            Prediction history       Should            Previous forecasts can be
                                                               reviewed.

  BR-016            Watchlist                Should            Users can save and remove
                                                               stocks.

  BR-017            Multi-stock portfolio    Should            Multiple stock signals
                    dashboard                                  can be viewed together.

  BR-018            Model performance        Must              RMSE and Directional
                    dashboard                                  Accuracy are visible.

  BR-019            Unit and integration     Must              Core pipeline and API
                    tests                                      tests pass.

  BR-020            README and architecture  Must              Setup and reproduction
                    documentation                              steps are documented.
  --------------------------------------------------------------------------------------

------------------------------------------------------------------------

## 6. User Stories

  -----------------------------------------------------------------------
  ID                                  User Story
  ----------------------------------- -----------------------------------
  US-001                              As a retail trader, I want to
                                      select a stock so that I can see
                                      its historical trend.

  US-002                              As a retail trader, I want to see a
                                      next-day forecast so that I can
                                      understand the model's expected
                                      direction.

  US-003                              As a retail trader, I want to see
                                      the expected percentage movement so
                                      that I can understand the magnitude
                                      of the forecast.

  US-004                              As a quant analyst, I want to
                                      inspect backtest results so that I
                                      can evaluate historical model
                                      behaviour.

  US-005                              As a quant analyst, I want to
                                      compare LSTM performance with a
                                      baseline so that I can determine
                                      whether the model adds value.

  US-006                              As a data scientist, I want to see
                                      RMSE and Directional Accuracy so
                                      that I can evaluate the model.

  US-007                              As a data scientist, I want
                                      walk-forward validation so that
                                      future observations do not leak
                                      into training.

  US-008                              As a user, I want a watchlist so
                                      that I can monitor selected stocks.

  US-009                              As a user, I want a multi-stock
                                      dashboard so that I can compare
                                      signals across my portfolio.

  US-010                              As an analyst, I want the model
                                      version displayed so that
                                      predictions are traceable.

  US-011                              As an analyst, I want prediction
                                      history so that I can compare
                                      forecasts against actual outcomes.

  US-012                              As a data scientist, I want
                                      reproducible experiments so that
                                      model results can be independently
                                      reproduced.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 7. User Experience and Information Architecture

### 7.1 Application Structure

The application should provide the following areas:

-   Dashboard
-   Stocks
-   Stock Detail
    -   Forecast
    -   Backtest
    -   Model Performance
-   Watchlist
-   Portfolio
-   Prediction History
-   Model Card
-   Settings

Authentication screens should provide login and the required session
flow.

### 7.2 Dashboard

The dashboard should contain: - Market overview. - Watchlist. - Recent
forecasts. - Top trend signals. - Model performance summary. -
Portfolio-level signal distribution.

### 7.3 Stock Search and Stock Detail

Users must be able to search for and select an available stock ticker.

The stock detail page should display: - Ticker. - Latest/current
price. - Predicted next-day price. - Expected percentage movement. -
Trend signal. - Model version. - Historical price chart. - Volume
chart. - Forecast visualization. - Backtest summary.

The source document mentions technical indicators as a possible
stock-detail visualization if implemented; they are not mandatory unless
included in the selected feature set.

### 7.4 Forecast Screen

The forecast screen should focus on: - Latest/current price. - Predicted
next-day price. - Expected return or percentage movement. -
Bullish/Neutral/Bearish signal. - Model version. - Forecast timestamp.

The prediction must be accompanied by relevant context and a visible
uncertainty/limitations message.

### 7.5 Historical Charts

The historical chart should support a selectable historical period and
display: - Open. - High. - Low. - Close. - Volume.

Charts must include readable labels and textual summaries where needed
for accessibility.

### 7.6 Backtest Screen

Users should be able to configure and inspect: - Date range. - Starting
capital. - Strategy settings. - Transaction cost and slippage
assumptions, where supported. - Position size and signal execution
assumptions. - Total return. - Maximum drawdown. - Sharpe ratio. - Win
rate. - Number of trades. - Average trade return. - Equity curve. -
Trade history. - Buy/sell signal visualization.

Backtest values must be calculated by the engine. They must never be
hardcoded.

### 7.7 Model Performance Screen

Display: - RMSE. - MAE. - Directional Accuracy. -
Actual-versus-predicted chart. - Confusion matrix. - Walk-forward fold
results. - Baseline comparison. - Directional performance analysis.

### 7.8 Watchlist and Portfolio

Users should be able to save stocks to a personal watchlist and remove
them later.

The portfolio-level dashboard should show the available trend signals
across multiple selected stocks. Example tickers in the source are
illustrative only; actual availability depends on dataset coverage.

### 7.9 Prediction History

Show historical forecasts and compare them with actual outcomes once
those outcomes become available.

Suggested fields: - Forecast date. - Ticker. - Predicted direction. -
Actual direction. - Result. - Model version.

### 7.10 Model Card

The model card must explain: - Model name and version. - Dataset and
date coverage. - Inputs and target. - Lookback window. - Architecture
and configuration. - Evaluation methodology and metrics. - Trend
thresholds. - Limitations. - Intended use. - Out-of-scope use. -
Monitoring and version information where implemented.

### 7.11 Accessibility and Responsive Behaviour

-   Support keyboard navigation.
-   Use semantic labels.
-   Show readable validation errors.
-   Support desktop, tablet, and mobile layouts.
-   Provide textual summaries for charts.
-   Do not rely only on colour to distinguish bullish and bearish
    states.
-   Ensure status and signal labels remain understandable without
    colour.

### 7.12 Required UI States

Every major page must support: - Loading. - Success. - Empty. -
Validation error. - API error. - Model unavailable. - Data unavailable.

The UI should use clear loading indicators or chart skeletons during
forecast and backtest processing, and understandable notifications for
timeouts and unavailable data.

------------------------------------------------------------------------

## 8. API Requirements

**Base path:** `/api/v1`

The backend is responsible for request validation, authentication,
forecast requests, backtesting, model metadata, and prediction history.

  -------------------------------------------------------------------------
  Method                  Endpoint                  Purpose
  ----------------------- ------------------------- -----------------------
  GET                     `/health`                 Check backend and
                                                    required model-artifact
                                                    availability.

  GET                     `/stocks`                 Return available stock
                                                    tickers.

  GET                     `/stocks/{ticker}`        Return historical
                                                    information for a
                                                    stock.

  GET                     `/forecast/{ticker}`      Return next-day
                                                    forecast and metadata.

  GET                     `/performance`            Return model metrics,
                                                    walk-forward results,
                                                    and baseline
                                                    comparison.

  POST                    `/backtest`               Run a historical
                                                    backtest for a ticker
                                                    and date range.

  GET                     `/predictions/{ticker}`   Return historical
                                                    forecasts and actual
                                                    outcomes where
                                                    available.

  GET                     `/watchlist`              Return the
                                                    authenticated user's
                                                    watchlist.

  POST                    `/watchlist`              Add a ticker to the
                                                    user's watchlist.

  DELETE                  `/watchlist/{ticker}`     Remove a ticker from
                                                    the user's watchlist.

  GET                     `/portfolio`              Return portfolio-level
                                                    trend information.

  GET                     `/model`                  Return model version,
                                                    training period,
                                                    features, sequence
                                                    length, and metrics.

  GET                     `/model-card`             Return the model card
                                                    and operational
                                                    metadata.
  -------------------------------------------------------------------------

### 8.1 Forecast Response

The forecast response should include: - `ticker` - `current_price` -
`predicted_price` - `expected_return` - `trend` - `model_version` -
`timestamp`

Timestamp should use ISO-8601 format.

### 8.2 Backtest Request

The backtest request should accept: - `ticker` - `start_date` -
`end_date` - `initial_capital`

The response should include: - `ticker` - `initial_capital` -
`final_capital` - `total_return` - `max_drawdown` - `sharpe_ratio` -
`win_rate` - `number_of_trades`

Additional output such as average trade return, equity curve, and trade
history should be returned when supported by the implementation.

### 8.3 Model Metadata

The model metadata endpoint should return: - Model name and version. -
Framework. - Task. - Intended use and out-of-scope use. - Inputs and
target. - Lookback window. - Validation protocol. - Evaluation
metrics. - Signal thresholds. - Artifact/scaler/configuration version
information where available.

### 8.4 API Error Handling

Use structured errors with a meaningful message, machine-readable code,
and request ID where possible.

Required error codes: - `INVALID_TICKER` - `INVALID_DATE_RANGE` -
`INVALID_REQUEST` - `DATA_UNAVAILABLE` - `MODEL_UNAVAILABLE` -
`BACKTEST_FAILED` - `UNAUTHORIZED`

Invalid tickers, malformed requests, unavailable data, invalid dates,
and unavailable model artifacts must fail in a controlled and
understandable way.

------------------------------------------------------------------------

## 9. Backtesting Requirements

The backtest engine must consume historical model predictions without
using future information.

Conceptual workflow:

`Historical Window → Generate Prediction → Generate Signal → Simulate Position → Apply Assumptions → Update Capital → Calculate Performance`

Backtest assumptions must be explicit and recorded: - Starting
capital. - Transaction costs. - Slippage. - Position size. - Signal
execution timing. - Entry and exit rules.

Required metrics: - Initial capital. - Final capital. - Total return. -
Maximum drawdown. - Sharpe ratio. - Win rate. - Number of trades. -
Average trade return.

Required visual evidence: - Equity curve. - Trade history. - Buy/sell
signal visualization.

Backtest results must be interpreted carefully because simulation
assumptions and historical bias can overstate real-world performance.
Profitability alone is not the definition of project success.

------------------------------------------------------------------------

## 10. Non-Functional Requirements

### 10.1 Performance

-   Forecast inference should be fast enough for interactive dashboard
    usage.
-   Load the model once during application startup rather than
    retraining it per request.
-   Keep expensive backtests separate from normal forecast requests.
-   Target warm inference latency: P50 below 80 ms and P95 below 200 ms,
    subject to the deployment environment.
-   Target model cold-start/artifact initialization below 1.5 seconds,
    subject to the deployment environment.
-   Target multi-year single-ticker backtest execution below 1 second,
    subject to the deployment environment.
-   The source also specifies a target of 50 concurrent requests without
    API degradation or 5xx failures.

These are performance targets to test, not claims of achieved
performance.

### 10.2 Reliability

-   Invalid ticker requests return meaningful errors.
-   Missing data is handled explicitly.
-   Model artifacts are validated before serving.
-   Provide a health endpoint.
-   Use structured API errors.
-   Validate requests.
-   Protect expensive operations with timeout handling.

### 10.3 Security

-   Securely hash passwords.
-   Store secrets in environment variables.
-   Protect user-specific resources.
-   Use HTTPS in production.
-   Restrict CORS to trusted origins.
-   Apply rate limiting where appropriate.
-   Validate ticker, date range, backtest parameters, request body, and
    user permissions.
-   Do not store credentials in source code.
-   Do not write sensitive user information to logs.
-   Handle errors securely.
-   Keep dependencies updated.

ML-specific risks to consider: - Malicious inputs. - Corrupted model
artifacts. - Data poisoning. - Distribution shift. - Prediction
misuse. - Unauthorized model replacement.

### 10.4 Reproducibility

Every training run must record: - Dataset version. - Feature list. -
Sequence length. - Split configuration. - Random seed where
applicable. - Model architecture. - Hyperparameters. - Training
period. - Validation method. - Evaluation metrics.

### 10.5 Scalability

Keep the MVP architecture simple and use a stateless FastAPI service
where possible. Do not introduce unnecessary microservices. GPU is not
mandatory for deployed inference; training may use a GPU if experiments
demonstrate the need.

------------------------------------------------------------------------

## 11. Database Requirements

A database is not required for the core forecasting engine. The ML
pipeline can operate as:

`Historical Data → Preprocessing → LSTM → Forecast`

An optional PostgreSQL database may support users, watchlists,
prediction history, portfolio configuration, and model metadata.

Suggested entities:

### 11.1 Users

  Field             Description
  ----------------- ----------------------------
  `id`              Primary key
  `email`           Unique user email
  `password_hash`   Hashed password
  `created_at`      Account creation timestamp

### 11.2 Watchlist

  Field          Description
  -------------- ---------------------------------
  `id`           Primary key
  `user_id`      Foreign key to users
  `ticker`       Saved stock ticker
  `created_at`   Timestamp when ticker was added

### 11.3 Predictions

  Field                Description
  -------------------- ------------------------------------------
  `id`                 Primary key
  `user_id`            Foreign key to users
  `ticker`             Target stock ticker
  `prediction_date`    Target date for forecast
  `current_price`      Latest close before forecast
  `predicted_price`    Predicted closing price
  `predicted_return`   Expected return
  `trend`              BULLISH / NEUTRAL / BEARISH
  `actual_price`       Actual closing price once available
  `actual_direction`   Actual movement direction once available
  `correct`            Directional correctness flag
  `model_version`      Model version used
  `created_at`         Forecast creation timestamp

### 11.4 Model Versions

  Field               Description
  ------------------- ------------------------------------------------
  `id`                Primary key
  `version`           Version identifier, e.g. LSTM-v1
  `architecture`      Architecture description or JSON specification
  `features`          Input feature list
  `sequence_length`   Lookback length
  `hyperparameters`   Training configuration
  `training_period`   Historical training date range
  `metrics`           Evaluation results
  `created_at`        Model-version creation timestamp

------------------------------------------------------------------------

## 12. System Responsibilities

The product consists of four major layers:

`Data Layer → ML Layer → API Layer → Frontend Layer`

### React Frontend

Responsible for: - Dashboard and user interaction. - Stock selection. -
Charts. - Forecast display. - Backtest visualization. -
Model-performance views.

### FastAPI Backend

Responsible for: - Request validation. - Authentication. - Forecast
requests. - Backtesting. - Model metadata. - Prediction history.

### Forecast Service

Responsible for: - Retrieving input data. - Preprocessing. - Creating
model input sequences. - Loading the LSTM artifact. - Generating
predictions. - Converting predictions into trend signals.

### Training Pipeline

Responsible for: - Data ingestion and cleaning. - EDA. - Feature
engineering. - Sequence creation. - Model training. - Validation and
evaluation. - Artifact generation.

------------------------------------------------------------------------

## 13. Testing and Acceptance

### 13.1 Unit Tests

Test: - Data validation. - Missing-value handling. - Feature
calculations. - Sequence generation. - Scaling. - Prediction
transformation. - Direction calculation. - Signal generation. -
Evaluation metrics. - Backtest calculations.

### 13.2 Integration Tests

Test the complete workflow:

`React → FastAPI → Forecast Service → Preprocessing → LSTM → Response`

### 13.3 API Tests

Test: - Valid ticker. - Invalid ticker. - Missing request data. -
Invalid dates. - Model unavailable. - Backtest request. - Unauthorized
requests.

### 13.4 UI Tests

Test: - Ticker search and selection. - Empty or invalid symbols. -
Unsupported date ranges. - Negative capital values. - Loading indicators
and chart skeletons. - Successful chart and forecast rendering. - Trend
signal display. - Backtest metrics table. - Backend-unavailable
banner. - Network timeout notifications. - Missing-data notifications. -
Desktop, tablet, and mobile layouts.

### 13.5 ML Tests

Test: - Correct sequence dimensions. - Correct chronological
train/validation/test ordering. - No scaler fitting on test data. -
Reproducibility. - Model artifact loading. - Consistent inference.

### 13.6 Sample Acceptance Tests

  -----------------------------------------------------------------------
  ID                      Scenario                Expected Result
  ----------------------- ----------------------- -----------------------
  TEST-001                Valid forecast request  Forecast is returned.

  TEST-002                Invalid ticker          Meaningful ticker error
                                                  is returned.

  TEST-003                Invalid date            Validation error is
                                                  returned.

  TEST-004                Missing data            Controlled
                                                  data-unavailable
                                                  response is returned.

  TEST-005                Sequence generation     Correct sequence
                                                  dimensions are
                                                  produced.

  TEST-006                Direction calculation   Direction is calculated
                                                  correctly.

  TEST-007                Signal generation       Correct trend mapping
                                                  is applied.

  TEST-008                Backtest                Valid calculated
                                                  metrics are returned.

  TEST-009                Model unavailable       Controlled
                                                  service-unavailable
                                                  response is returned.

  TEST-010                API integration         Valid end-to-end
                                                  response is returned.
  -----------------------------------------------------------------------

### 13.7 Definition of Done

The MVP is complete when: - Dataset source and actual schema are
documented. - Dataset validation and EDA are completed. - Baseline and
LSTM experiments are reproducible. - Chronological and walk-forward
evaluation is completed. - RMSE and Directional Accuracy are recorded
from actual experiments. - LSTM is compared honestly with the
baseline. - Signal thresholds and backtest assumptions are documented. -
Forecast and performance APIs work. - The React dashboard displays the
end-to-end forecast. - Required authentication/session handling works. -
Core unit, integration, API, UI, and ML tests pass. - Model card,
README, and architecture documentation are complete. - Deployment and
smoke tests succeed. - Limitations are communicated clearly.

------------------------------------------------------------------------

## 14. CI/CD, Observability, and Deployment

### 14.1 CI/CD Pipeline

Suggested pipeline:

`Git Push → Lint → Unit Tests → ML Pipeline Tests → API Tests → Frontend Tests → Build → Artifact Validation → Deploy → Smoke Test`

Model quality gates before deployment: - Dataset validation passes. -
Pipeline tests pass. - Model artifact exists and is valid. - Model
version exists. - Metrics are recorded. - Evaluation report exists. - No
accidental test-set tuning occurred. - Model card is updated.

Use feature branches and pull requests for major changes.

### 14.2 Observability

Application logs may include: - Request ID. - Endpoint. - Status. -
Response time. - Model version. - Error code.

Do not log sensitive user information.

Monitor: - Request count. - Error rate. - API latency. - Model-loading
failures. - Forecast request count. - Backtest request count. -
Model-version usage.

If used continuously, ML monitoring should consider: - Input
distribution. - Missingness. - Prediction distribution. - Model
performance once actual outcomes become available. - Market-regime
changes. - Drift.

The health endpoint must verify that required model artifacts are
available.

### 14.3 Deployment Architecture

Deployment flow:

`Internet → React Frontend → HTTPS/API → FastAPI Backend → Forecast Service → LSTM Model / Database / Historical Market Data`

Deployment approach: - Deploy React as a static web application. -
Deploy FastAPI as a containerized service. - Package model weights,
preprocessing, feature configuration, metadata, and version as a
reproducible artifact. - GPU is not mandatory for inference. - Retain
previous model versions to support rollback.

Keep infrastructure lightweight. Exact infrastructure costs must be
calculated from the selected hosting provider rather than estimated
without evidence.

------------------------------------------------------------------------

## 15. Risks, Constraints, and Limitations

  -----------------------------------------------------------------------
  Risk                                Product Consideration
  ----------------------------------- -----------------------------------
  Market non-stationarity             Historical relationships may not
                                      persist in future periods.

  Data leakage                        Incorrect preprocessing or
                                      splitting can produce misleadingly
                                      strong results.

  Backtest bias                       Simulated performance may overstate
                                      real-world performance.

  OHLCV-only inputs                   External market events and
                                      fundamentals are not captured.

  Dataset coverage                    Dataset coverage may not represent
                                      every real-world trading
                                      environment.

  Prediction misuse                   Users may interpret forecasts as
                                      guaranteed outcomes.

  Model drift                         Input distributions and market
                                      regimes can change.

  Resource constraints                Training and hyperparameter search
                                      may be computationally expensive.
  -----------------------------------------------------------------------

The project must report weaknesses and failed cases, not only successful
predictions.

------------------------------------------------------------------------

## 16. Project Roadmap

The project duration is 12 weeks.

  Phase                    Timeline       Deliverable
  ------------------------ -------------- ------------------------------------
  Research                 Week 1         LSTM paper review and fundamentals
  Dataset                  Weeks 1--2     Dataset acquisition and validation
  EDA                      Week 2         EDA report
  Features                 Week 3         Feature pipeline
  Baseline                 Week 4         Baseline model and metrics
  Time-Series Model        Weeks 4--6     Initial and tuned LSTM
  Evaluation               Weeks 6--7     Walk-forward results and metrics
  Backtesting              Weeks 7--8     Backtest engine and report
  FastAPI                  Weeks 8--9     REST API
  React                    Weeks 9--10    Dashboard
  Integration              Weeks 10--11   End-to-end application
  Testing and Deployment   Week 11        Tests and deployment
  Finalization             Week 12        Documentation and presentation

**Project deadline stated in the source brief:** November 25, 2026.

------------------------------------------------------------------------

## 17. Final Deliverables

1.  LSTM forecasting model.
2.  Baseline model and comparison.
3.  Dataset validation and EDA report.
4.  Feature and sequence-generation pipeline.
5.  Walk-forward evaluation report.
6.  RMSE, MAE, and Directional Accuracy results.
7.  Error-analysis report.
8.  Historical backtesting engine and backtest report.
9.  FastAPI REST API.
10. React trend-signal dashboard.
11. Basic authentication and user-session handling.
12. Model card and model-version metadata.
13. Unit and integration tests.
14. README and architecture documentation.
15. Deployed full-stack application.
16. Final project presentation/demo.

------------------------------------------------------------------------

## 18. Success Criteria

Project quality should be judged by evidence that: - The forecasting
problem is clearly formulated. - Data validation is correct and
reproducible. - There is no future-data leakage. - The baseline
comparison is meaningful. - The LSTM is implemented and evaluated
correctly. - Walk-forward evaluation is completed. - RMSE and
Directional Accuracy are analyzed. - Errors and market-regime
limitations are investigated. - Backtesting assumptions are
transparent. - The FastAPI service and React dashboard work end to
end. - Tests pass and experiments can be reproduced. - Model versions
and model-card information are available. - Limitations are communicated
honestly.

The project must not define success as profitability alone.

------------------------------------------------------------------------

## 19. Open Decisions to Resolve During Implementation

The source brief intentionally leaves several values dependent on the
actual dataset or implementation choices. Resolve and document them
before final evaluation:

1.  Exact dataset source, version, date range, ticker coverage, and
    schema.
2.  Final model input feature list, including whether optional technical
    indicators are included.
3.  Final target representation and forecast transformation.
4.  Exact chronological split boundaries and walk-forward fold dates.
5.  Final signal thresholds selected using training/validation data.
6.  Backtest execution rules, transaction costs, slippage, and position
    sizing.
7.  Whether PostgreSQL is enabled for the MVP or user/history features
    use another persistence approach.
8.  Final hosting provider and measured performance under deployment
    conditions.

Do not invent dataset statistics, model metrics, backtest results, or
infrastructure costs to fill these gaps.
