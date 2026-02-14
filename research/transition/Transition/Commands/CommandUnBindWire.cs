using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Common;

namespace Easycoustics.Transition.Commands
{
    public class CommandUnBindWire : ICircuitCommand
    {
        public CommandType CommandType => CommandType.ReBuildAndCalculate;


        public string Title => "UnBindWire " + Wire.ToString() + " Terminal number" + WireTerminalNumber.ToString() + 
            " From " + BoundedObject.ToString() + " Terminal number " + ObjectTerminalNumber.ToString() ;

        public SerializableWire Wire { get; set; }
        public byte WireTerminalNumber { get; set; }

        public SerializableElement BoundedObject { get; set; }
        public byte ObjectTerminalNumber { get; set; }

        public Point2D newPosition;
        public override string ToString() => Title;

        public void execute()
        {
            Wire.unBind(WireTerminalNumber);
            Wire.updatePosition(newPosition, WireTerminalNumber);
        }

        public void unExecute()
        {
            Wire.doBind(WireTerminalNumber, BoundedObject, ObjectTerminalNumber);
        }

       
    }
}
