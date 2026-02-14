using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.Design;

namespace Easycoustics.Transition.Commands
{
    class CommandRemoveComponent : ICircuitCommand
    {
        public CommandType CommandType => CommandType.ReBuildAndCalculate;

        public string Title => "Remove Component: " + Component.ToString();
       
        public SerializableComponent Component { get; }
        public List<SerializableWire> BindedWires { get; } = new List<SerializableWire>();

        public void execute()
        {
            UserDesign.CurrentDesign.Components.Remove(Component);
        }
        
        public void unExecute()
        {
            UserDesign.CurrentDesign.Components.Add(Component);

            foreach (SerializableWire wire in BindedWires)
                UserDesign.CurrentDesign.Wires.Add(wire);

           
        }

        public CommandRemoveComponent(SerializableComponent comp)
        {
            Component = comp;

            for (byte i = 0; i < comp.QuantityOfTerminals; i++)
                BindedWires.AddRange(UserDesign.CurrentDesign.getBoundedWires(comp, i));
                 
        }

        public override string ToString()
        {
            string output = Title;
            output += Environment.NewLine;

            foreach (SerializableWire wire in BindedWires)
                output += "Wire " + wire.ToString() + Environment.NewLine;
            
            return output;
        }

    }
}
