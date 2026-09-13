use clap::{Parser, Subcommand};
use si_net::parse_invite;
use si_tokenomics::{genesis_amount, FUNDS, TOTAL_SUPPLY, TOTAL_UNITS};
use si_wallet::new_wallet;

#[derive(Parser)]
#[command(name = "si", about = "si CLI — wallet, silsila, token, referral")]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Create a new wallet (prints address; seed to stdout once)
    Wallet {
        #[command(subcommand)]
        action: WalletCmd,
    },
    Silsila {
        #[command(subcommand)]
        action: SilsilaCmd,
    },
    Token {
        #[command(subcommand)]
        action: TokenCmd,
    },
    Ref {
        #[command(subcommand)]
        action: RefCmd,
    },
}

#[derive(Subcommand)]
enum WalletCmd {
    New,
}

#[derive(Subcommand)]
enum SilsilaCmd {
    Check {
        #[arg(long)]
        a: String,
        #[arg(long)]
        b: String,
    },
}

#[derive(Subcommand)]
enum TokenCmd {
    GenesisInfo,
}

#[derive(Subcommand)]
enum RefCmd {
    Apply { code: String },
}

fn main() {
    let cli = Cli::parse();
    match cli.cmd {
        Cmd::Wallet { action: WalletCmd::New } => match new_wallet() {
            Ok((mnemonic, kp)) => {
                println!("address {}", kp.address);
                println!("mnemonic {mnemonic}");
                println!("write the words on paper. this is the only print.");
            }
            Err(e) => {
                eprintln!("{e}");
                std::process::exit(1);
            }
        },
        Cmd::Token { action: TokenCmd::GenesisInfo } => {
            println!("SILAL total {TOTAL_SUPPLY}");
            println!("units {TOTAL_UNITS}");
            println!("sum_funds {}", genesis_amount());
            for f in FUNDS {
                println!("{} {} {}bps", f.id, f.amount, f.bps);
            }
        }
        Cmd::Silsila {
            action: SilsilaCmd::Check { a, b },
        } => {
            println!("si CLI does not ship a demo tree.");
            println!("Use the app Silsila, then kinship {a} / {b}.");
        }
        Cmd::Ref {
            action: RefCmd::Apply { code },
        } => match parse_invite(&code) {
            Ok(inv) => println!("{inv:?} — depth 1, paid only from the community fund"),
            Err(_) => {
                eprintln!("bad code");
                std::process::exit(1);
            }
        },
    }
}

