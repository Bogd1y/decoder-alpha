import {
    IonButton,
    IonList,
    IonLabel,
    IonItem,
    IonInput,
    IonModal,
    IonContent,
    IonHeader,
    IonToolbar, IonTitle, useIonToast, IonIcon, IonSearchbar, IonPopover, IonRadioGroup, IonRadio,
} from '@ionic/react';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import Loader from "../components/Loader";
import {instance} from "../axios";
import {environment} from "../environments/environment";
import * as solanaWeb3 from '@solana/web3.js';
import {add, albums, chevronDown, chevronUp, close, notifications, notificationsOutline, wallet, cog} from "ionicons/icons";
import {useSelector} from "react-redux";
import {RootState} from "../redux/store";
import ReactTooltip from "react-tooltip";
import Cookies from "universal-cookie";
import {getLiveFoxTokenData, shortenedWallet} from "../components/FoxTokenFns";
import Table from '../components/Table';
import { Column } from '@material-table/core';
import _ from 'lodash';
import { AppComponentProps } from '../components/Route';
import FoxTokenCharts from '../components/FoxTokenCharts';
import { FoxTokenData } from '../types/FoxTokenTypes';
import useFoxTokenChartCookies from '../components/useFoxTokenChartCookies';
import { css } from '@emotion/react';
import moment from 'moment';
import {useHistory} from "react-router";
import FfNamed from "./home/FfNamed";
import usePersistentState from "../hooks/usePersistentState"

const columns: Column<FoxTokenData>[] = [
    {
        title: 'Token',
        render: (record) => (
            <a
                href={`https://famousfoxes.com/tokenmarket/${record.token}`}
                target="_blank"
                className="hover:opacity-80 flex items-center space-x-3"
            >
                {shortenedWallet(record.token)}
                &nbsp;
                <IonIcon
                    src="/assets/icons/newTabIcon.svg"
                    css={css`
						color: var(--ion-text-color);
					`}
                />
            </a>
        ),
        customSort: (a, b) => a.token.localeCompare(b.token),
		customFilterAndSearch: (term, rowData) => rowData.token?.toLowerCase().includes(term.toLowerCase()),
    },
    {
        title: 'Name',
        customSort: (a, b) => a.name.localeCompare(b.name),
        render: (record) => <span>{record.name}</span>,
		customFilterAndSearch: (term, rowData) => rowData.name?.toLowerCase().includes(term.toLowerCase()),
    },
    {
        title: 'Price',
        customSort: (a, b) => a.floorPrice - b.floorPrice,
        render: (record) => <span>{record.floorPrice}</span>,
    },
    {
        title: 'Listings',
        customSort: (a, b) => a.totalTokenListings - b.totalTokenListings,
        render: (record) => <span>{record.totalTokenListings}</span>,
    },
    // REMOVING-FF-FOR-NOW
    // {
    //     title: 'Last Sale',
    //     customSort: (a, b) => new Date(a.lastSaleDate) as any - (new Date(b.lastSaleDate) as any),
    //     render: (record) => <span>{record.lastSaleDate ? moment(record.lastSaleDate).fromNow() : null}</span>,
    // },
    {
        title: '# Owned & Wallet',
        render: (record) => <span>{record.whichMyWallets}</span>,
        // sorter: (a, b) => a.whichMyWallets.localeCompare(b.whichMyWallets),
    }
];

interface FoxToken {
    contentRef: AppComponentProps["contentRef"]
}

function FoxToken({contentRef}: FoxToken) {

    const [present, dismiss] = useIonToast();
    const history = useHistory();

    /**
     * Adding multiple wallets
     */
    const [addMultWallModalOpen, setAddMultWallModalOpen] = useState(false); // model open or not
    const [formWalletMult, setFormWalletMult] = useState(''); // single wallet in the form
    const [formLoadingMultWallet, setFormLoadingMultWallet] = useState(false); // form loading

    const local_host_str = 'localhost';
    const firstUpdate = useRef(true);

    const [popoverOpened, setPopoverOpened] = useState(false);
    const [viewAbuse, setViewAbuse] = useState(false);

    const cookies = useMemo(() => new Cookies(), []);

	const {
		chartDateSelected,
		setChartDateSelected,
		lineColorSelected,
		setLineColorSelected,
		shadedAreaColorSelected,
		setShadedAreaColorSelected
	} = useFoxTokenChartCookies()
    const [hidHelpTop, setHidHelpTop] = usePersistentState<boolean>('hidHelpTop', false)

    const clickedSetHidHelpTop = () => {
        setHidHelpTop(true);
    }

    const [multWalletAryFromCookie, setMultWalletAryFromCookie] = useState(cookies.get('multWalletsAry')); // mult. wallets you have from cookies
    // clicked link to add multiple wallets
    const clickedMultWall = (val: boolean) => {
        setAddMultWallModalOpen(val);
        // setPopoverOpened(false);
    }

    // in the modal for multiple wallets - submit button clicked
    const addMultWalletsSubmit = () => {

        if (multWalletAryFromCookie && multWalletAryFromCookie.split(",").length == 3) {
            present({
                message: 'Error - you may only track a maximum of 3 wallets',
                color: 'danger',
                duration: 8000
            });
            return;
        }

        if (!formWalletMult || formWalletMult.length !== 44) {
            present({
                message: 'Error - please enter a single, valid SOL wallet address',
                color: 'danger',
                duration: 5000
            });
            return;
        }

        setFormLoadingMultWallet(true);

        try {
            // let existingMultWalletsAry = cookies.get('multWalletsAry');
            // didn't set any yet
            if (!multWalletAryFromCookie) {
                cookies.set("multWalletsAry", formWalletMult);
                setMultWalletAryFromCookie(formWalletMult);
                // update cookie
            } else {
                const newVal = multWalletAryFromCookie + ',' + formWalletMult;
                cookies.set("multWalletsAry", newVal.toString());
                setMultWalletAryFromCookie(newVal);
            }

            // setFormErrMsg('');

            setFormLoadingMultWallet(false); // loading false
            setFormWalletMult(''); // clear the form
            setMultWalletAryFromCookie(cookies.get('multWalletsAry')); // set array to show user on frontend

            present({
                message: 'Successfully added the wallet',
                color: 'success',
                duration: 5000
            });

        } catch (err) {
            console.error(err);
            setFormLoadingMultWallet(false); // loading false

            present({
                message: 'An error occurred when adding your Wallet',
                color: 'danger',
                duration: 5000
            });
        }
    }

    // user clicked button to delete their multiple wallets
    const resetMultWallets = () => {

        // @ts-ignore
        present({
            cssClass: '',
            header: 'Delete Wallets?',
            message: 'Are you sure you want to reset all of your stored wallets?',
            buttons: [
                'Cancel',
                {
                    text: 'Ok', handler: () => {

                        cookies.remove("multWalletsAry");

                        present({
                            message: 'Successfully removed all wallets.',
                            color: 'success',
                            duration: 5000
                        });

                        setMultWalletAryFromCookie(null);

                    }
                },
            ],
        });

    }

    /**
     * States & Variables
     */
    const [tableData, _setTableData] = useState<FoxTokenData[]>([]);
    const [fullTableData, setFullTableData] = useState<FoxTokenData[]>([]);
    const [mySolBalance, setMySolBalance] = useState("");

    const setTableData = (data: FoxTokenData[]) =>
        _setTableData(data.map((row) => ({...row, id: row.token})));
    const [mySplTokens, setMySplTokens]: any = useState([]);

    const [viewMyTokensClicked, setViewMyTokensClicked] = useState(false);
    const walletAddress = useSelector(
        (state: RootState) => state.wallet.walletAddress
    );

    /**
     * Use Effects
     */

    /**
     * Functions
     */

    // load table data!
    const fetchTableData = async () => {
            setTableData([]);

            const data: any = await getLiveFoxTokenData(mySplTokens);

            // sometimes only gets named ones...
            if(data.length > 50 && data.length < 500){
                present({
                    message: 'We had trouble loading all tokens. Refresh to load all tokens',
                    color: 'danger',
                    duration: 5000
                });
            }

            if(data.length > 0){
                setTableData(data);
                setFullTableData(data);
            }else{
                present({
                    message: 'Unable to load data. Refresh and try again.',
                    color: 'danger',
                    duration: 5000
                });
            }
        }


    // give a wallet ... return all spl tokens in it
    const getSplFromWallet = async (wallet: string) => {

        try {
            console.log("going out to " + wallet);

            // https://docs.solana.com/developing/clients/javascript-reference
            let base58publicKey = new solanaWeb3.PublicKey(wallet.toString());

            const connection = new solanaWeb3.Connection(
                solanaWeb3.clusterApiUrl('mainnet-beta'), 'confirmed',
            );

            // let account = await connection.getAccountInfo(base58publicKey);
            // console.log(account?.data);
            // https://github.com/solana-labs/solana/blob/master/web3.js/examples/get_account_info.js
            let balance = await connection.getBalance(base58publicKey); // SOL balance
            balance = balance / 1000000000;
            // @ts-ignore
            setMySolBalance(balance);

            // https://github.com/michaelhly/solana-py/issues/48
            let tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                base58publicKey,
                {programId: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")},
            );


            let mySplTokensTemporaryAgainAgain: any = [];

            for (let i in tokenAccounts.value) {
                if (tokenAccounts.value[i]?.account?.data?.parsed?.info?.tokenAmount.uiAmount !== 0) {
                    // console.log(tokenAccounts.value[i]);
                    mySplTokensTemporaryAgainAgain.push({
                        token: tokenAccounts.value[i]?.account?.data?.parsed?.info?.mint,
                        amount: tokenAccounts.value[i]?.account?.data?.parsed?.info?.tokenAmount.uiAmount,
                        myWallet: wallet
                    });
                }
            }

            return mySplTokensTemporaryAgainAgain;

        } catch (err) {
            present({
                message: 'Error when getting your Whitelist tokens from your wallet',
                color: 'danger',
                duration: 5000
            });

            return [];
        }

    }

    // https://github.com/solana-labs/solana-program-library/blob/master/token/js/examples/create_mint_and_transfer_tokens.ts
    // https://docs.solana.com/es/developing/clients/jsonrpc-api#gettokenaccountsbyowner
    const getUserSpls = async () => {
        let mySplTokensTemporary: any = [];

        // if no wallet is logged in ... OR didn't set multiple wallets in a cookie, then return table and do nothing else
        // if(!walletAddress && !multWalletAryFromCookie){
        //     await fetchTableData();
        //     return;
        // }

        // first try with the wallet address we got logged in
        if (walletAddress) {
            // @ts-ignore
            mySplTokensTemporary = mySplTokensTemporary.concat(await getSplFromWallet(walletAddress));
        }

        // now go through the wallets in cookies
        if (multWalletAryFromCookie) {
            for (let i in multWalletAryFromCookie.split(",")) {
                const tempWall = multWalletAryFromCookie.split(",")[i];
                // make sure it's length of a sol wallet ... and that its not the connected wallet
                if (tempWall.length === 44 && tempWall !== walletAddress) {
                    mySplTokensTemporary = mySplTokensTemporary.concat(await getSplFromWallet(tempWall));
                }

            }
        }

        // @ts-ignore
        setMySplTokens(mySplTokensTemporary);

        // console.log(mySplTokensTemporary);
    }

    // load table data, after we load in user tokens
    // isn't called on local host, see below useEffect
    useEffect(() => {
        if (firstUpdate.current) {
            firstUpdate.current = false;
            return;
        }

        // only fetch data when NOT on local host ... after spl tokens is updated
        if (window.location.href.indexOf(local_host_str) === -1) {
            fetchTableData();
        }

    }, [mySplTokens]);

    // call on load, when cookie array set
    useEffect(() => {

        // however DON'T do this in local host (will do this elsewhere ... since get RPC blocked)
        if (window.location.href.indexOf(local_host_str) === -1) {
            getUserSpls();
        } else {
            fetchTableData();
        }


    }, [multWalletAryFromCookie]);
    // also call when new wallet is connected to
    useEffect(() => {
        if (window.location.href.indexOf(local_host_str) === -1 && walletAddress) {
            getUserSpls();
        }
    }, [walletAddress]);

    /**
     * for submitting custom token names
     */
    const [addNameModalOpen, setAddNameModalOpen] = useState(false);
    const [formToken, setFormToken] = useState('');
    const [formName, setFormName] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [formErrMsg, setFormErrMsg] = useState('');
    const clickedAddName = (val: boolean) => {
        setAddNameModalOpen(val);
        // setPopoverOpened(false);
    }

    // submit form to add new wallet
    const submittedForm = () => {

        const body = {
            formToken: formToken,
            formName: formName,
        }

        setFormLoading(true);
        setFormErrMsg('');

        instance.post(environment.backendApi + '/receiver/foxTokenNameAdd', body).then(resp => {

            if (resp.data.error) {
                setFormLoading(false);
                if (resp.data.message) {
                    setFormErrMsg(resp.data.message);
                } else {
                    setFormErrMsg('An error occurred. Please contact us if this continues to happen');
                }

            } else {
                setFormLoading(false);
                setFormToken('');
                setFormName('');

                clickedAddName(false);

                // show toast
                present({
                    message: 'Successfully added the name. Refresh to see it',
                    color: 'success',
                    duration: 5000
                });
            }

        }).catch(err => {
            console.error(err);

            setFormLoading(false);
            setFormErrMsg(err);
        });
    }

    // Viewing MY tokens - filter the table
    const viewMyTokens = async (wantViewTokens: boolean) => {
        // setPopoverOpened(null);

        // user wants to see MY tokens
        if (wantViewTokens) {

            // set the fact they viewed their token
            instance.get(environment.backendApi + '/receiver/userViewedMyToken');

            // see other local host on here to see why
            if (window.location.href.indexOf(local_host_str) !== -1) {
                await getUserSpls();
            }

            if (!multWalletAryFromCookie && !walletAddress) {
                present({
                    message: 'Please connect to your wallet, or click "Add Multiple Wallets" to add one (or three!) manually. Then you can filter this table to only the tokens in your wallet.',
                    color: 'danger',
                    duration: 10000
                });
                return;
            }

            // make sure they have tokens
            if (mySplTokens.length === 0) {

                // show toast
                present({
                    message: 'No tokens found on your wallet(s) :( Tokens must be in your wallet, and have an active listing on Fox Token Market',
                    color: 'danger',
                    duration: 5000
                });
                return;

            } else {

                setViewMyTokensClicked(true);
                // setTableData([]);

                // new array of data we'll set later
                let newTableData: any = [];

                // loop through table data (all fox tokens)
                for (let i in tableData) {
                    // if match, then push
                    for (let y in mySplTokens) {
                        if (mySplTokens[y].token === tableData[i].token) {

                            if (window.location.href.indexOf(local_host_str) !== -1) {
                                // then ADD data
                                if (!tableData[i].whichMyWallets) {
                                    tableData[i].whichMyWallets = shortenedWallet(mySplTokens[y].myWallet);
                                } else {
                                    tableData[i].whichMyWallets += ", " + shortenedWallet(mySplTokens[y].myWallet);
                                }
                            }

                            newTableData.push(tableData[i]);
                            break;
                        }
                    }
                }

                if (newTableData.length === 0) {
                    present({
                        message: 'None of your tokens are also listed on FF Token Market :(',
                        color: 'danger',
                        duration: 5000
                    });
                    return;
                }

                // this should instantly show the table to the user
                setTableData(newTableData);

                // REMOVING-FF-FOR-NOW
                // but then we need to go out and get their latest sales data... takes about 1.5 sec per token
                // instance
                //     .post(`${environment.backendApi}/receiver/foxTokenLatestSale`, { tokens: newTableData.map((x: any) => x.token) })
                //     .then((res) => {
                //         const sales = res?.data?.data.salesData;
                //         if(sales){
                //             sales.forEach((sale: {token: string, lastSaleDate: string}) => {
                //                 const row = newTableData.find((d: any) => d.token === sale.token);
                //                 row.lastSaleDate = sale.lastSaleDate;
                //             });
                //
                //             // once we get the data, then we can set it yet again...
                //             setTableData(newTableData);
                //         }
                //     }).finally(() => {
                //
                //     });

            }

            // user wants to see ALL tokens
        } else {
            setViewMyTokensClicked(false);

            setTableData(fullTableData);
        }
    };

    /**
     * Renders
     */

    return (
        <>

            {/*
                modal - adding multiple wallets
            */}
            <IonModal
                isOpen={addMultWallModalOpen}
                onDidDismiss={() => clickedMultWall(false)}
            >
                <IonHeader>
                    <IonToolbar>
                        <IonTitle>
                            Add Multiple Wallets
                            <a
                                className="float-right text-base underline cursor-pointer"
                                onClick={() => clickedMultWall(false)}
                            >
                                <IonIcon icon={close} className="h-6 w-6"/>
                            </a>
                        </IonTitle>
                    </IonToolbar>
                </IonHeader>

                <IonContent className="">
                    <div
                        className="ml-3 mr-3 mb-2 relative mt-2 bg-gradient-to-b from-bg-primary to-bg-secondary p-3 rounded-xl">
                        <div className="font-medium">
                            {' '}
                            {/* text-lg   */}
                            <p>
                                Used with "View My Tokens" (where you can
                                filter the table to show only tokens in your
                                wallet). Use this to filter the table to
                                tokens that are on multiple wallets. Data is
                                saved per browser, within your cookies.
                            </p>
                        </div>
                    </div>

                    <div
                        hidden={!multWalletAryFromCookie}
                        className="ml-3 mr-3 mb-5 relative bg-gradient-to-b from-bg-primary to-bg-secondary p-3 rounded-xl"
                    >
                        <div className="font-medium">
                            {' '}
                            {/* text-lg   */}
                            <span className="font-bold">
                                    Wallets Added:
                                </span>
                            <ul>
                                {multWalletAryFromCookie
                                    ? multWalletAryFromCookie
                                        .split(',')
                                        .map(function (wallet: any) {
                                            return <li key={wallet}>- {wallet}</li>;
                                        })
                                    : ''}
                            </ul>
                        </div>
                    </div>

                    <div className="ml-3 mr-3">
                        <IonItem>
                            <IonLabel
                                position="stacked"
                                className="font-bold"
                            >
                                SOL Wallet Address
                            </IonLabel>
                            <IonInput
                                onIonChange={(e) =>
                                    setFormWalletMult(e.detail.value!)
                                }
                                value={formWalletMult}
                                placeholder="ex. 91q2zKjAATs28sdXT5rbtKddSU81BzvJtmvZGjFj54iU"
                            ></IonInput>
                        </IonItem>

                        <IonButton
                            color="success"
                            className="mt-5"
                            hidden={formLoadingMultWallet}
                            onClick={() => addMultWalletsSubmit()}
                        >
                            Submit
                        </IonButton>
                        <IonButton
                            hidden={!multWalletAryFromCookie}
                            color="danger"
                            className="mt-5"
                            onClick={() => resetMultWallets()}
                        >
                            Reset Stored Wallets
                        </IonButton>

                        <div hidden={!formLoading}>Loading...</div>
                    </div>
                </IonContent>
            </IonModal>

            {/* modal - For adding a new token */}
            <IonModal
                isOpen={addNameModalOpen}
                onDidDismiss={() => setAddNameModalOpen(false)}
            >
                <IonHeader>
                    <IonToolbar>
                        <IonTitle>
                            Add a Custom Token Name
                            <a
                                className="float-right text-base underline cursor-pointer"
                                onClick={() => clickedAddName(false)}
                            >
                                <IonIcon icon={close} className="h-6 w-6"/>
                            </a>
                        </IonTitle>
                    </IonToolbar>
                </IonHeader>

                <IonContent className="">
                    <div
                        className="ml-3 mr-3 mb-5 relative bg-gradient-to-b from-bg-primary to-bg-secondary p-3 rounded-xl">
                        <div className="font-medium">
                            <p>
                                Use this if a token on the Fox WL Token Market doesn't have an
                                official name yet, and you know for certain
                                what the name of the token is
                            </p>

                            <span
                                className="underline cursor-pointer"
                                onClick={() => setViewAbuse(!viewAbuse)}
                            >
                                    View Abuse Policy
                                </span>
                            <p className="mt-3" hidden={!viewAbuse}>
                                Your discord name will be recorded when
                                submitting the form. Those abusing the
                                service will receive such punishments as
                                having your account banned from entering
                                data, with severe violations being
                                permanently muted in the Discord
                            </p>
                        </div>
                    </div>

                    {/*bg-gradient-to-b from-bg-primary to-bg-secondary"*/}
                    <div className="ml-3 mr-3">
                        <IonItem>
                            <IonLabel
                                position="stacked"
                                className="font-bold"
                            >
                                Token
                            </IonLabel>
                            <IonInput
                                onIonChange={(e) =>
                                    setFormToken(e.detail.value!)
                                }
                                placeholder="ex. Hxq2zKjAATs28sdXT5rbtKddSU81BzvJtmvZGjFj54iU"
                            ></IonInput>
                        </IonItem>

                        <IonItem>
                            <IonLabel
                                position="stacked"
                                className="font-bold"
                            >
                                Name
                            </IonLabel>
                            <IonInput
                                onIonChange={(e) =>
                                    setFormName(e.detail.value!)
                                }
                                placeholder="ex. Zillas vs Kong WL"
                            ></IonInput>
                        </IonItem>

                        <IonButton
                            color="success"
                            className="mt-5"
                            hidden={formLoading}
                            onClick={() => submittedForm()}
                        >
                            Submit
                        </IonButton>

                        <div hidden={!formLoading}>Loading...</div>

                        <div
                            className="m-12 relative mt-6 bg-red-100 p-6 rounded-xl"
                            hidden={!formErrMsg}
                        >
                            <p className="text-lg text-red-700 font-medium">
                                {typeof formErrMsg === "string" ? formErrMsg : 'An error occurred, please try again later'}
                                {/*<b>An error occurred, please try again later</b>*/}
                            </p>
                            <span
                                className="absolute bg-red-500 w-8 h-8 flex items-center justify-center font-bold text-green-50 rounded-full -top-2 -left-2">
                                    !
                                </span>
                        </div>
                    </div>
                </IonContent>
            </IonModal>

            {/* please don't remove this... we need this to teach the user... */}
            <div className="m-3 relative bg-primary p-4 rounded-xl" hidden={hidHelpTop}>
                <p className="text-medium text-white font-medium">
                    <b>
                        <IonIcon icon={wallet}/> Click this on the top right of the table, to filter the table to only the whitelist tokens in your wallet. You may either connect your wallet in the top right of the site, or add 1-3 wallets with the "+" button discussed below
                        <br/> <IonIcon icon={albums}/> Used with the above "View My Tokens", use this to filter the table to tokens that are on multiple wallets. You may add up to three wallets to watch
                        <br/> <IonIcon icon={add}/> Use this if a token on the Fox WL Token Market doesn't have an official name yet, and you know for certain what the name of the token is
                        <br/> 📈 Show a Price, Listings, and Sales history charts for that token
                    </b>
                    <br/>
                    <IonButton
                        color="secondary"
                        className="text-sm space-x-1"
                        onClick={() => { clickedSetHidHelpTop() }}
                    >
                        Got it!
                    </IonButton>
                </p>
                <span className="absolute bg-red-500 w-8 h-8 flex items-center justify-center font-bold text-green-50 rounded-full -top-2 -left-2">
                    ?
                </span>
            </div>

            <div>
                {!tableData.length ? (
                    <div className="pt-10 flex justify-center items-center">
                        <Loader />
                    </div>
                ) : (
                    <div css={css`
						@media (max-width: 576px){
							.MuiToolbar-root > .MuiTextField-root {
								display : none;
							}
						}
					`}>
                        {/*<IonItem style={{"width": "250px"}}>*/}
                        {/*    <IonLabel>Show Verified Only</IonLabel>*/}
                        {/*    <IonCheckbox onIonChange={e => setCheckedVerifiedOnly(e.detail.checked)} />*/}
                        {/*</IonItem>*/}
                        <Table
                            data={tableData}
                            columns={columns}
                            title="Fox WL Token Market"
                            description="
                            👪 are community added names.
                            'Not Listed' means it is not listed for sale anymore, and shown for historical purposes.
                            "
                            // REMOVING-FF-FOR-NOW
                            // The Last Sale column is only updated when viewing the chart or your own tokens (which updates it for others as well).
                            url="https://famousfoxes.com/tokenmarket"
                            actions={[
                                {
                                    icon: () => <IonIcon icon={wallet} className="text-red-600 text-4xl" />,
                                    tooltip: viewMyTokensClicked
                                        ? 'View All Tokens'
                                        : 'View My Tokens',
                                    onClick: () =>
                                        viewMyTokens(!viewMyTokensClicked),
                                    isFreeAction: true,
                                },
                                {
                                    icon: () => <IonIcon icon={notifications}/>,
                                    tooltip: 'Alert on new Tokens to your Wallet',
                                    onClick: () => history.push('/alerts#fnt'),
                                    isFreeAction: true,
                                },
                                {
                                    icon: () => <IonIcon icon={albums}/>,
                                    tooltip: 'Track Multiple wallets',
                                    onClick: () => clickedMultWall(true),
                                    isFreeAction: true,
                                },
								{
									icon: () => <IonIcon icon={add}/>,
                                    tooltip: 'Add Custom Token Name',
                                    onClick: () => clickedAddName(true),
                                    isFreeAction: true,
								},
                                // BUG-92-commented-out-4
								// {
                                //     icon: () => (
                                //         <>
                                //             <IonIcon
                                //                 icon={cog}
                                //             />
                                //             <IonPopover
                                //                 isOpen={!!popoverOpened}
                                //                 onDidDismiss={() =>
                                //                     setPopoverOpened(false)
                                //                 }
                                //             >
                                //                 <IonContent>
                                //                     <div className="p-2">
                                //                         <h3 className="font-bold pb-1 w-full pt-5">
                                //                             Date Format
                                //                         </h3>
                                //
                                //                         <IonList>
                                //                             <IonRadioGroup
                                //                                 value={
                                //                                     chartDateSelected
                                //                                 }
                                //                                 onIonChange={(
                                //                                     e
                                //                                 ) =>
                                //                                     setChartDateSelected(
                                //                                         e.detail
                                //                                             .value
                                //                                     )
                                //                                 }
                                //                             >
                                //                                 <IonItem>
                                //                                     <IonLabel>
                                //                                         "2 hours
                                //                                         ago"
                                //                                     </IonLabel>
                                //                                     <IonRadio value="fromNow" />
                                //                                 </IonItem>
                                //
                                //                                 <IonItem>
                                //                                     <IonLabel>
                                //                                         "2022-01-01
                                //                                         12:00"
                                //                                     </IonLabel>
                                //                                     <IonRadio value="yyyyMmDd" />
                                //                                 </IonItem>
                                //                             </IonRadioGroup>
                                //                         </IonList>
                                //
                                //                         <h3 className="font-bold pb-1 w-full pt-5">
                                //                             Chart Colors
                                //                         </h3>
                                //
                                //                         <IonItem>
                                //                             <IonLabel
                                //                                 position="stacked"
                                //                                 className="font-bold"
                                //                             >
                                //                                 Line Color
                                //                             </IonLabel>
                                //                             <IonInput
                                //                                 onIonChange={(
                                //                                     e
                                //                                 ) =>
                                //                                     setLineColorSelected(
                                //                                         e.detail
                                //                                             .value!
                                //                                     )
                                //                                 }
                                //                                 value={
                                //                                     lineColorSelected
                                //                                 }
                                //                                 placeholder="red, #c6ac95, rgb(255, 0, 0)"
                                //                             ></IonInput>
                                //                         </IonItem>
                                //                         <IonItem>
                                //                             <IonLabel
                                //                                 position="stacked"
                                //                                 className="font-bold"
                                //                             >
                                //                                 Shaded Area
                                //                                 Color
                                //                             </IonLabel>
                                //                             <IonInput
                                //                                 onIonChange={(
                                //                                     e
                                //                                 ) =>
                                //                                     setShadedAreaColorSelected(
                                //                                         e.detail
                                //                                             .value!
                                //                                     )
                                //                                 }
                                //                                 value={
                                //                                     shadedAreaColorSelected
                                //                                 }
                                //                                 placeholder="red, #c6ac95, rgb(255, 0, 0)"
                                //                             ></IonInput>
                                //                         </IonItem>
                                //                     </div>
                                //                 </IonContent>
                                //             </IonPopover>
                                //
                                //             {/*--{token}-{name}-*/}
                                //         </>
                                //     ),
                                //     tooltip: 'Customise',
                                //     isFreeAction: true,
								// 	onClick: () => setPopoverOpened(true)
                                // },
                            ]}
                            options={{
                                detailPanelType: "single",
                                search: true,
                            }}
                            detailPanel={[
                                {
                                    icon: "📈",
                                    tooltip: "View Chart",
                                    render: (record) => (
                                        <FoxTokenCharts {...record.rowData}/>
                                    ),
                                }
                            ]}

                        />

                        {/*-{foxLineData.labels}-*/}
                    </div>
                )}
            </div>

            {/*recent FF tokens*/}
            <FfNamed/>

            <ReactTooltip/>


            <br/>
        </>
    );
}

export default FoxToken;
