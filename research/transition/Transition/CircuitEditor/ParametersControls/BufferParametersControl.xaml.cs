using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Easycoustics.Transition.Commands;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.CustomControls;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The User Control item template is documented at https://go.microsoft.com/fwlink/?LinkId=234236

namespace Easycoustics.Transition.CircuitEditor.ParametersControls
{
    public sealed partial class BufferParametersControl : UserControl
    {
        private Serializable.Buffer SerializableBuffer { get; }
        private string oldElementName;


        public BufferParametersControl()
        {
            this.InitializeComponent();
        }

        public BufferParametersControl(Serializable.Buffer buffer)
        {
            this.InitializeComponent();

            SerializableBuffer = buffer;

            buffer.PropertyChanged += handleChangeOfControls;

            handleChangeOfControls(null, null);

        }

        private void elementNameChanged(object sender, TextChangedEventArgs e)
        {
            if (oldElementName == txtElementName.Text) return;

            var command = new CommandSetValue()
            {
                Component = SerializableBuffer,
                Property = "ElementName",
                OldValue = oldElementName,
                NewValue = txtElementName.Text
            };

            executeCommand(command);

            oldElementName = txtElementName.Text;
        }

        private void handleChangeOfControls(object sender, PropertyChangedEventArgs args)
        {
            SerializableBuffer.PropertyChanged -= handleChangeOfControls;
            
            txtElementName.TextChanged -= ElementNameChanged;
            txtElementName.Text = SerializableBuffer.ElementName;
            txtElementName.TextChanged += ElementNameChanged;

            chkInvert.Checked -= chkInvertChecked;
            chkInvert.Unchecked -= chkInvertUnchecked;
            chkInvert.IsChecked = SerializableBuffer.InverterInput;
            chkInvert.Checked += chkInvertChecked;
            chkInvert.Unchecked += chkInvertUnchecked;

            boxDelay.Value = SerializableBuffer.Delay;
            boxGain.Value = SerializableBuffer.Gain;

            boxRIn.Value = SerializableBuffer.RIn;
            boxROut.Value = SerializableBuffer.ROut;

            SerializableBuffer.PropertyChanged += handleChangeOfControls;
        }

        private void RInChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableBuffer,
                Property = "RIn",
                OldValue = SerializableBuffer.RIn,
                NewValue = boxRIn.Value
            };

            executeCommand(command);
        }

        private void ROutChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableBuffer,
                Property = "ROut",
                OldValue = SerializableBuffer.ROut,
                NewValue = boxROut.Value
            };

            executeCommand(command);
        }


        private void ElementNameChanged(object sender, TextChangedEventArgs e)
        {
            if (oldElementName == txtElementName.Text) return;

            var command = new CommandSetValue()
            {
                Component = SerializableBuffer,
                Property = "ElementName",
                OldValue = oldElementName,
                NewValue = txtElementName.Text
            };

            executeCommand(command);

            oldElementName = txtElementName.Text;
        }

        private void elementNameFocus(object sender, RoutedEventArgs e)
        {
            oldElementName = SerializableBuffer.ElementName;
        }


        private void executeCommand(ICircuitCommand command)
        {
            CircuitEditor.currentInstance.executeCommand(command);
        }

        private void gainChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableBuffer,
                Property = "Gain",
                OldValue = args.oldValue,
                NewValue = args.newValue
            };

            executeCommand(command);
        }

        private void delayChanged(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableBuffer,
                Property = "Delay",
                OldValue = args.oldValue,
                NewValue = args.newValue
            };

            executeCommand(command);
        }

        private void chkInvertChecked(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableBuffer,
                Property = "InverterInput",
                OldValue = SerializableBuffer.InverterInput,
                NewValue = true
            };

            executeCommand(command);
        }

        private void chkInvertUnchecked(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableBuffer,
                Property = "InverterInput",
                OldValue = SerializableBuffer.InverterInput,
                NewValue = false
            };

            executeCommand(command);
        }
    }
}
