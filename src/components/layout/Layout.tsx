import React, { useState } from "react";
import { styled, Container, useTheme } from "@mui/material";
import { Outlet } from "react-router-dom";
import { Header } from "../header";
import { Footer } from "../footer";
import Notifications from "../Notifications";

const MainWrapper = styled("div")(() => ({
  display: "flex",
  minHeight: "100vh",
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden"
}));

const PageWrapper = styled("div")(() => ({
  display: "flex",
  flexGrow: 1,
  flexDirection: "column",
  zIndex: 1,
  backgroundColor: "transparent",
  minWidth: 0,
  width: "100%",
  maxWidth: "100%"
}));

const Layout = () => {
  const theme = useTheme();
  return (
    <MainWrapper>
      <PageWrapper>
        <Header />
        <Container
          sx={{
            padding: "0px !important",
            [theme.breakpoints.up("sm")]: {
              maxWidth: "100%"
            },
            width: "100%"
          }}
        >
          <Outlet />
          {Notifications()}
        </Container>
        <Footer />
      </PageWrapper>
    </MainWrapper>
  );
};

export default Layout;
