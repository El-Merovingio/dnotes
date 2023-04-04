import type { NextPage } from "next";
import Head from "next/head";
import { NoteView } from "../views";

const Notes: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Solana Scaffold</title>
        <meta
          name="description"
          content="Basic Functionality"
        />
      </Head>
      <NoteView />
    </div>
  );
};

export default Notes;
