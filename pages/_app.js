import "../styles/globals.css";
import Head from "next/head";

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="google-site-verification" content="_TodwBix_GYhoYVAnOn-h5r_xxK17EWlp6wiUiLVQ0k" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
