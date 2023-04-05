import { useState, useEffect, useMemo, FC } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import * as anchor from "@project-serum/anchor";
import { Program, AnchorProvider as Provider, web3, utils, BN } from '@project-serum/anchor';
import {
  GlowWalletAdapter,
  PhantomWalletAdapter,
  SlopeWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { ConnectionProvider, WalletProvider, useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Button, Container, Form } from 'react-bootstrap';
import idl from '../idl.json';
import { notify } from "../utils/notifications";
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
require('@solana/wallet-adapter-react-ui/styles.css');

const { Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } = web3;
const idl_string = JSON.stringify(idl)
const idl_object = JSON.parse(idl_string)
const programID = new PublicKey(idl.metadata.address);

const wallets = [
  new PhantomWalletAdapter(),
  new GlowWalletAdapter(),
  new SolflareWalletAdapter(),
  new TorusWalletAdapter(),
]

export const NoteProvider: FC = () => {
  const [value, setValue] = useState(null);
  const [notes, setNotes] = useState([]) // returns the results in an array, so []
  const wallet = useWallet();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { connection } = useConnection();

  const getDate = (timestamp: number): Date => {
    return new Date(timestamp * 1000);
  }

  // const getProvider = async () => {
  async function getProvider() {

    // const network = "http://127.0.0.1:8899";
    const network = "https://api.devnet.solana.com";
    const connection = new Connection(network, Provider.defaultOptions());
    //const endpoint = useMemo(() => network, [network]);

    const provider = new Provider(
      connection, wallet, Provider.defaultOptions(),
    );
    return provider;
  }


//   const getProvider = () => {
//     const provider = new Provider(connection, wallet, Provider.defaultOptions())
//     return provider
// }

// const createNew = async (publicKey) => {
 async function createNew(publicKey: PublicKey) {
    if (!title || title.length > 50) return ( 
      console.log("Error while setting the title, length > 50?"),
      notify({ type: 'error', message: "Error while setting the title, length > 50?" })
    )
    if (!description || description.length > 500) return (
      console.log("Error while setting the description, length > 500?"),
      notify({ type: 'error', message: "Error while setting the description, length > 50?" })
    )
    if (!wallet) return
    
    const provider = await getProvider()
    /* create the program interface combining the idl, program ID, and provider */
    const program = new Program(idl_object, programID, provider);

    // console.log("Provid ", provider);
    // console.log("programID ", programID.toBase58());
    // console.log("idl_object ", idl_object);
    // console.log("WALL: ", wallet, "Wall addr", wallet.publicKey)
    // console.log("Title ", title, "descr", description)
    try {
      const seeds = utils.bytes.utf8.encode("noteaccount");
      // const s2 = provider.wallet.publicKey.toBuffer();
      // console.log("seeds ", seeds);
      // console.log("s2 ", s2);
      const par1 = Math.floor(Math.random() * (256 - 1) + 1);
      // console.log("par1 ", par1);

      const parsed_id = new anchor.BN(par1).toArrayLike(Buffer, 'be', 1);
      // console.log("parsed_id ", parsed_id);

      let [note] = PublicKey.findProgramAddressSync([
        seeds, publicKey.toBuffer(), parsed_id], program.programId);

      await program.methods.createNote(par1, title, description)
        .accounts({
          note: note,
          user: wallet.publicKey,
          rent: web3.SYSVAR_RENT_PUBKEY,
          systemProgram: web3.SystemProgram.programId
        }).rpc()

      const account = await program.account.note.fetch(note);
      // console.log('account: ', account);
      // console.log("Note addr: ", note.toBase58())
      // console.log('account: ', account);
      setValue(account);
      notify({ type: 'success', message: 'Note created!' });
      setTitle("");
      setDescription("");
      getNotes();
    } catch (err) {
      // console.log("Transaction error: ", err);
      notify({ type: 'error', message: err });
    }
  }

  const getNotes = async () => {
    const provider = await getProvider()
    /* create the program interface combining the idl, program ID, and provider */
    const program = new Program(idl_object, programID, provider);


    try {
      // The promises will change
      Promise.all((await connection.getProgramAccounts(programID)) // UI connection, not Anchor connection
        .map(async note => ({
          // for each one of the accounts but we need more info, such bank pubkey
          ...(await program.account.note.fetch(note.pubkey)),
          pubkey: note.pubkey
        })))
        // printout in a console
        .then(notes => {
          // console.log(notes)
          // we want to display to UI level in our return func, so we create a new state
          // we declare const [banks, setBanks] = useState() up
          setNotes(notes)
          setTitle("");
          setDescription("");
        })

    } catch (error) {
      console.log("Error during fetching banks: " + error)
      notify({ type: 'error', message: error });

    }
  }

  const editNote = async (publicKey: PublicKey) => {
    if (!title || title.length > 50) return ( 
      console.log("Error while setting the title, length > 50?"),
      notify({ type: 'error', message: "Error while setting the title, length > 50?" })
      // publicKey = publicKey.toBase58()
    )
    if (!description || description.length > 500) return (
      console.log("Error while setting the description, length > 500?"),
      notify({ type: 'error', message: "Error while setting the description, length > 50?" })
      // publicKey = 0
    )
    if (!wallet) return

    // using some of the deposit
    const provider = await getProvider()
    /* create the program interface combining the idl, program ID, and provider */
    const program = new Program(idl_object, programID, provider);
    // https://docs.solana.com/es/developing/clients/javascript-reference

    try {
      await program.methods.updateNote(title, description)
        // BigNumber must be in lamports
        .accounts({
          note: publicKey,
          user: wallet.publicKey,  // is the signer 
          systemProgram: web3.SystemProgram.programId
        }).rpc()

      console.log("Note: ", publicKey, " was updated by: ", wallet.publicKey);
      notify({ type: 'info', message: 'Note updated!' });
      setTitle("");
      setDescription("");
      getNotes();

    } catch (error) {
      console.error("Error while updating: + " + error);
      notify({ type: 'error', message: error });
    }
  }

  const delNote = async (publicKey) => {
    // using some of the deposit
    const provider = await getProvider()
    const program = new Program(idl_object, programID, provider);
    // https://docs.solana.com/es/developing/clients/javascript-reference

    try {
      await program.methods.deleteNote()
        // BigNumber must be in lamports
        .accounts({
          note: publicKey,
          user: wallet.publicKey,  // is the signer 
          systemProgram: web3.SystemProgram.programId
        }).rpc()

      console.log("Note: ", publicKey, " was deleted by: ", wallet.publicKey);
      notify({ type: 'info', message: 'Note deleted!' });
      setTitle("");
      setDescription("");

    } catch (error) {
      console.error("Error while deleting: + " + error);
      notify({ type: 'error', message: error });
    }
  }

  if (!wallet.publicKey) {
    /* If the user's wallet is not connected, display connect wallet button. */
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
        <WalletMultiButton />
      </div>
    )
  } else {

    return (
      <>
        {notes.map((note) => (
          // return (
          <div className="overflow-x-auto" key={note.id}>
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Last Edited</th>
                  <th>Delete</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{note.title}</td>
                  <td>{note.description}</td>
                  <td>{getDate(note.timestamp).toLocaleDateString("default")}</td>
                  <td>{getDate(note.lastEdit).toLocaleDateString("default")}</td>

                  <td>
                    <div className="dropdown dropdown-end">
                      <label tabIndex={0} className="btn m-1">More options</label>
                      <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                        <li><a onClick={() => {
                          if (window.confirm("Are you sure you want to delete this note?" + note.id)) {
                            delNote(note.pubkey);
                          }
                        }}
                        >Delete Note</a></li></ul></div></td>

                  <td>
                    <div className='header' key='my-modal'>
                      <input type="checkbox" id={note.id} className="modal-toggle" />
                      <div className="modal">
                        <div className="modal-box">
                          <h1 className="subti text-5xl font-bold text-transparent"><b>Edit Note</b></h1>
                          <Form>
                            <Form.Group controlId={note.id}>
                              <Form.Label><b>Note ID</b></Form.Label>
                              <Form.Control
                                type="number"
                                name={note.pubkey}
                                placeholder={note.id}
                                className="block text-center dark:bg-blue-700"
                                value={note.id}
                                readOnly
                                disabled
                                onChange={(e) => setValue(e.target.value)}
                              />
                            </Form.Group>
                            <Form.Group controlId={note.title}>
                              <Form.Label><b>Title</b></Form.Label>
                              <Form.Control
                                type="text"
                                // name="titleID"
                                placeholder="Enter new note title (Max 50 length)"
                                className="block dark:bg-gray-700"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                              />
                            </Form.Group>
                            <Form.Group controlId={note.description}>
                              <Form.Label><b>Description</b></Form.Label>
                              <Form.Control
                                as="textarea"
                                // name="descID"
                                placeholder="Enter new note description (Max 500 length)"
                                className="block dark:bg-gray-700"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                              />
                            </Form.Group>
                            <Button variant="primary group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 
                                text-black"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to edit this note?" + " {ID = " + note.id + "}")) {
                                  editNote(note.pubkey)
                                }
                              }}>
                              {/* onClick={editNote(note.pubkey)}> */}
                              Edit Note
                            </Button>
                          </Form>
                          <div className="modal-action">
                            <label htmlFor={note.id} className="btn">Close</label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <a onClick={() => {
                      setTitle("");
                      setDescription("");
                    }}><label htmlFor={note.id} className="btn"> Edit Note</label></a>
                  </td>

                </tr>
              </tbody>
            </table>
          </div>
          // )
        ))}


        <div className="form">
          <>
            <div>
              <h1 className="subti text-5xl font-bold text-transparent"><b>Create Note</b></h1>
              <Form>
                <Form.Group controlId="noteTitle">
                  <Form.Label><b>Title</b></Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter note title (Max 50 length)"
                    className="block dark:bg-gray-700"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </Form.Group>
                <Form.Group controlId="noteDescription">
                  <Form.Label><b>Description</b></Form.Label>
                  <Form.Control
                    as="textarea"
                    placeholder="Enter note description (Max 500 length)"
                    className="block dark:bg-gray-700"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Form.Group>
                <Button variant="primary group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 
text-black" onClick={() => {createNew(wallet.publicKey)}}>
                  Create Note
                </Button>
              </Form>
              <button
                className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                onClick={() => getNotes()}
              >
                <div className="hidden group-disabled:block">
                  Wallet not connected
                </div>
                <span className="block group-disabled:hidden" >
                  Get Notes
                </span>
              </button>
            </div>
          </>
        </div>
      </>
    );
  }
};

// export const NoteProvider = () => (
//   // export const NoteProvider: FC = () => (
//   <ConnectionProvider endpoint="https://api.devnet.solana.com">
//     <WalletProvider wallets={wallets} autoConnect>
//       <WalletModalProvider>
//         <Notes />
//       </WalletModalProvider>
//     </WalletProvider>
//   </ConnectionProvider>
// )
