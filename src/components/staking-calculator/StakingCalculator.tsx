import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from "@mui/material";
import { CALCULATOR_API_URL } from "../../config/config";
import GrowthChart, { ChartPoint } from "./GrowthChart";

type DurationUnit = "days" | "years";
type CompoundingFrequency = "daily" | "weekly" | "monthly" | "annually";
type Status = "idle" | "loading" | "success" | "error";

interface CalculationResult {
  projectedBalance: number;
  rewardsEarned: number;
  projectedBalanceUsd: number | null;
  rewardsEarnedUsd: number | null;
  tokenPrice: number | null;
  duration: { value: number; unit: DurationUnit; years: number };
  compoundingFrequency: CompoundingFrequency;
  periodsPerYear: number;
  rateInterpretation: "nominal";
  chart: ChartPoint[];
}

const money = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const frequencies: { value: CompoundingFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "annually", label: "Annually" },
];

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    backgroundColor: "background.paper",
    "& fieldset": { borderColor: "#d7e6e8", borderWidth: "2px" },
    "&:hover fieldset": { borderColor: "#00b4c9" },
    "&.Mui-focused fieldset": { borderColor: "#00b4c9" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#173039" },
};

const toggleSx = {
  display: "flex",
  flexWrap: "wrap",
  gap: 1,
  "& .MuiToggleButtonGroup-grouped": {
    border: "2px solid #d7e6e8 !important",
    borderRadius: "6px !important",
    mx: 0,
    textTransform: "none",
    fontWeight: 700,
    color: "#173039",
    px: 1.5,
  },
  "& .Mui-selected": {
    backgroundColor: "#173039 !important",
    color: "#ffffff !important",
    borderColor: "#173039 !important",
  },
};

const StakingCalculator = () => {
  const theme = useTheme();
  const [principal, setPrincipal] = useState("1000");
  const [apy, setApy] = useState("5");
  const [duration, setDuration] = useState("365");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("days");
  const [compoundingFrequency, setCompoundingFrequency] =
    useState<CompoundingFrequency>("daily");
  const [tokenPrice, setTokenPrice] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<CalculationResult | null>(null);
  const dark = theme.palette.mode === "dark";

  const validate = () => {
    const principalValue = Number(principal);
    const apyValue = Number(apy);
    const durationValue = Number(duration);
    if (!Number.isFinite(principalValue) || principalValue <= 0) {
      return "Enter a principal greater than 0.";
    }
    if (!Number.isFinite(apyValue) || apyValue < 0 || apyValue > 1000) {
      return "APY must be a nominal annual rate from 0 to 1000.";
    }
    if (!Number.isFinite(durationValue) || durationValue <= 0) {
      return "Duration must be greater than 0.";
    }
    const years = durationUnit === "years" ? durationValue : durationValue / 365;
    if (years > 100) {
      return "Duration must not exceed 100 years.";
    }
    if (tokenPrice.trim() !== "") {
      const price = Number(tokenPrice);
      if (!Number.isFinite(price) || price <= 0) {
        return "Token price must be greater than 0, or left blank.";
      }
    }
    return "";
  };

  const calculate = async () => {
    const validationMessage = validate();
    if (validationMessage) {
      setStatus("error");
      setMessage(validationMessage);
      setResult(null);
      return;
    }

    const payload: Record<string, number | string> = {
      principal: Number(principal),
      apy: Number(apy),
      duration: Number(duration),
      durationUnit,
      compoundingFrequency,
    };
    if (tokenPrice.trim() !== "") {
      payload.tokenPrice = Number(tokenPrice);
    }

    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch(CALCULATOR_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setStatus("error");
        setResult(null);
        setMessage(data?.error || "The calculator rejected this request.");
        return;
      }
      setResult(data);
      setStatus("success");
    } catch {
      setStatus("error");
      setResult(null);
      setMessage("The local calculator API is not reachable.");
    }
  };

  return (
    <Box
      sx={{
        border: "2px solid #00dbe3",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
      }}
    >
      <Box
        sx={{
          background: dark
            ? "linear-gradient(to right, #10181c, #173039)"
            : "linear-gradient(to right, #173039, #00b4c9)",
          color: "#fff",
          px: { xs: 2, md: 3 },
          py: { xs: 2.5, md: 3 },
        }}
      >
        <Typography sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 700, lineHeight: 1.15 }}>
          Staking rewards
        </Typography>
        <Typography sx={{ mt: 1, maxWidth: 720, color: "rgba(255,255,255,0.88)", fontSize: 15 }}>
          Nominal annual rate, compounded with A = P(1 + r/n)^(nt). Frequency changes the projected balance.
        </Typography>
      </Box>

      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          calculate();
        }}
        sx={{ p: { xs: 2, md: 3 }, display: "flex", flexDirection: "column", gap: 2.5 }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr 1fr" },
            gap: 2,
          }}
        >
          <TextField
            label="Principal"
            type="number"
            value={principal}
            onChange={(event) => setPrincipal(event.target.value)}
            inputProps={{ min: 0, step: "any", "aria-label": "Principal" }}
            InputProps={{ endAdornment: <InputAdornment position="end">tokens</InputAdornment> }}
            sx={fieldSx}
            required
          />
          <TextField
            label="Nominal APY"
            type="number"
            value={apy}
            onChange={(event) => setApy(event.target.value)}
            inputProps={{ min: 0, max: 1000, step: "any", "aria-label": "Nominal APY" }}
            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
            sx={fieldSx}
            required
          />
          <TextField
            label="Token price"
            type="number"
            value={tokenPrice}
            onChange={(event) => setTokenPrice(event.target.value)}
            placeholder="Optional"
            inputProps={{ min: 0, step: "any", "aria-label": "Token price" }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            sx={fieldSx}
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "220px 1fr" },
            gap: 2,
            alignItems: "end",
          }}
        >
          <TextField
            label="Duration"
            type="number"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            inputProps={{ min: 0, step: "any", "aria-label": "Duration" }}
            sx={fieldSx}
            required
          />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <ToggleButtonGroup
              exclusive
              value={durationUnit}
              onChange={(_event, value: DurationUnit | null) => {
                if (value) setDurationUnit(value);
              }}
              aria-label="Duration unit"
              sx={toggleSx}
            >
              <ToggleButton value="days">Days</ToggleButton>
              <ToggleButton value="years">Years</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup
              exclusive
              value={compoundingFrequency}
              onChange={(_event, value: CompoundingFrequency | null) => {
                if (value) setCompoundingFrequency(value);
              }}
              aria-label="Compounding frequency"
              sx={toggleSx}
            >
              {frequencies.map((item) => (
                <ToggleButton key={item.value} value={item.value}>
                  {item.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Box>

        <Button
          type="submit"
          variant="contained"
          disabled={status === "loading"}
          sx={{
            alignSelf: { xs: "stretch", sm: "flex-start" },
            minWidth: 220,
            backgroundColor: "#00dbe3",
            color: "#ffffff",
            borderRadius: "6px",
            height: 56,
            px: 4,
            fontWeight: 700,
            fontSize: 18,
            textTransform: "uppercase",
            "&:hover": { backgroundColor: "#23a2bb" },
          }}
        >
          {status === "loading" ? (
            <CircularProgress size={22} sx={{ color: "#fff" }} />
          ) : (
            "Calculate"
          )}
        </Button>

        {status === "idle" && (
          <Box
            sx={{
              borderRadius: "8px",
              backgroundColor: dark ? "rgba(255,255,255,0.04)" : "#f3f3f3",
              px: 2,
              py: 1.5,
            }}
          >
            <Typography sx={{ color: theme.palette.text.secondary }}>
              Calculate to see the projected balance, rewards earned, and how the stake grows.
            </Typography>
          </Box>
        )}
        {status === "loading" && (
          <Typography sx={{ color: theme.palette.text.secondary }}>
            Calculating…
          </Typography>
        )}
        {status === "error" && <Alert severity="error">{message}</Alert>}
        {status === "success" && result && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1.4fr 1fr" },
                gap: 2,
              }}
            >
              <ResultStat
                emphasis
                label="Projected balance"
                value={money.format(result.projectedBalance)}
                hint={
                  result.projectedBalanceUsd != null
                    ? `$${money.format(result.projectedBalanceUsd)}`
                    : undefined
                }
              />
              <ResultStat
                label="Rewards earned"
                value={money.format(result.rewardsEarned)}
                hint={
                  result.rewardsEarnedUsd != null
                    ? `$${money.format(result.rewardsEarnedUsd)}`
                    : undefined
                }
              />
            </Box>
            <Typography sx={{ color: theme.palette.text.secondary, fontSize: 14 }}>
              {result.duration.value} {result.duration.unit} · {result.duration.years.toFixed(4)} years
              · {result.compoundingFrequency} · {result.periodsPerYear} periods per year
            </Typography>
            <GrowthChart points={result.chart} tokenPrice={result.tokenPrice} />
          </Box>
        )}
      </Box>
    </Box>
  );
};

const ResultStat = ({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) => {
  const theme = useTheme();
  const dark = theme.palette.mode === "dark";
  return (
    <Box
      sx={{
        borderRadius: "8px",
        p: 2,
        background: emphasis
          ? "linear-gradient(to right, #173039, #00b4c9)"
          : dark
            ? "rgba(255,255,255,0.04)"
            : "#f3f3f3",
        color: emphasis ? "#fff" : theme.palette.text.primary,
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", opacity: 0.8 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 700, lineHeight: 1.15, mt: 0.5 }}>
        {value}
      </Typography>
      {hint && (
        <Typography sx={{ mt: 0.5, fontSize: 14, opacity: 0.85 }}>{hint} USD</Typography>
      )}
    </Box>
  );
};

export default StakingCalculator;
