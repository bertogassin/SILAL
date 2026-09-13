pragma SPARK_Mode (On);

package Ledger is
   Total_Units : constant := 10_000_000_000_000_000;

   subtype Unit is Long_Long_Integer range 0 .. Total_Units;
   subtype Tx_Id is Long_Long_Integer;

   type Account_Id is mod 2 ** 32;

   function Conservation (Sum_Balances : Unit; Burned : Unit) return Boolean
     with Post => Conservation'Result = (Sum_Balances + Burned = Total_Units);

   procedure Transfer
     (From, To     : Account_Id;
      Amount       : Unit;
      Id           : Tx_Id;
      From_Balance : in out Unit;
      To_Balance   : in out Unit;
      Seen         : in out Boolean)
     with
       Pre  => Amount > 0
               and then From /= To
               and then not Seen
               and then From_Balance >= Amount
               and then To_Balance <= Total_Units - Amount,
       Post => Seen
               and then From_Balance = From_Balance'Old - Amount
               and then To_Balance = To_Balance'Old + Amount
               and then From_Balance + To_Balance =
                        From_Balance'Old + To_Balance'Old;
end Ledger;
