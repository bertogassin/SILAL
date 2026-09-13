pragma SPARK_Mode (On);

--  Future bank and insurer plug into this frame.
--  They do not replace it.
package Bank is
   Interest_Bps : constant := 0;
   Auto_Insurance_Pay : constant Boolean := False;
   Licensed : constant Boolean := False;

   function No_Riba return Boolean
     with Post => No_Riba'Result = (Interest_Bps = 0);

   function No_Auto_Pay return Boolean
     with Post => No_Auto_Pay'Result = (not Auto_Insurance_Pay);
end Bank;
